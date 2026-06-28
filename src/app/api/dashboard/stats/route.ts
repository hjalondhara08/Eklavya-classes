import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeePayment from '@/models/FeePayment';
import Expense from '@/models/Expense';
import Branch from '@/models/Branch';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchIdParam = searchParams.get('branchId');

    const role = session.user.role;
    const operatorBranchId = session.user.branchId;
    
    // Determine the branch context
    const targetBranchId = (role === 'operator' && operatorBranchId) ? operatorBranchId : branchIdParam;

    const defaultStart = new Date('2026-05-01T00:00:00Z');
    const defaultEnd = new Date('2027-04-30T23:59:59.999Z');

    const startDate = startDateParam ? new Date(startDateParam) : defaultStart;
    const endDate = endDateParam ? new Date(endDateParam) : defaultEnd;
    if (endDateParam) {
      endDate.setHours(23, 59, 59, 999);
    }

    // 1. Fetch all students matching branch context in ONE query
    const studentQuery: any = {};
    if (targetBranchId && targetBranchId !== 'general') {
      studentQuery.branchId = targetBranchId;
    }
    const allStudents = await Student.find(studentQuery).select('yearlyFees branchId isActive').lean() as any[];

    // Split in-memory
    const activeStudents = allStudents.filter(s => s.isActive);
    const activeStudentsCount = activeStudents.length;
    const totalStudentsCount = allStudents.length;

    const totalExpectedPeriod = activeStudents.reduce((sum, s) => sum + (s.yearlyFees || 0), 0);

    // 2. Fetch all fee payments in date range in ONE query, populating student and creator info
    const feeFilter: any = {
      transactionDate: { $gte: startDate, $lte: endDate }
    };
    if (targetBranchId && targetBranchId !== 'general') {
      feeFilter.studentId = { $in: allStudents.map(s => s._id) };
    }
    const feePayments = await FeePayment.find(feeFilter)
      .populate({
        path: 'studentId',
        select: 'name standard branchId'
      })
      .populate('createdBy', 'name')
      .lean() as any[];
    
    const totalCollectedFees = feePayments.reduce((sum, p) => sum + p.amount, 0);

    // 3. Fetch all expenses in date range in ONE query, populating branch info
    const expenseFilter: any = {
      transactionDate: { $gte: startDate, $lte: endDate }
    };
    const allExpenses = role === 'admin' ? await Expense.find(expenseFilter).populate('branchId', 'name').lean() as any[] : [];

    // Filter expenses list to matching branch context in-memory
    let filteredExpenses = allExpenses;
    if (targetBranchId) {
      if (targetBranchId === 'general') {
        filteredExpenses = allExpenses.filter(e => !e.branchId);
      } else {
        filteredExpenses = allExpenses.filter(e => e.branchId?._id?.toString() === targetBranchId || e.branchId?.toString() === targetBranchId);
      }
    }
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Get top 5 expenses in-memory
    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.createdAt).getTime();
      const dateB = new Date(b.transactionDate || b.createdAt).getTime();
      return dateB - dateA;
    });
    const expensesList = sortedExpenses.slice(0, 5);

    // 4. Build branch stats using fast in-memory lookups
    const branches = await Branch.find({ isActive: true }).lean() as any[];
    const branchStats = [];

    for (const b of branches) {
      if (role === 'operator' && operatorBranchId && b._id.toString() !== operatorBranchId) {
        continue;
      }

      const branchIdStr = b._id.toString();

      // Filter students in-memory
      const branchStudentsList = activeStudents.filter(s => s.branchId?.toString() === branchIdStr);
      const branchStudentsCount = branchStudentsList.length;
      const branchExpectedPeriod = branchStudentsList.reduce((sum, s) => sum + (s.yearlyFees || 0), 0);

      // Filter payments in-memory (using populated studentId)
      const branchCollected = feePayments
        .filter(p => p.studentId?.branchId?.toString() === branchIdStr)
        .reduce((sum, p) => sum + p.amount, 0);

      // Filter expenses in-memory
      const branchExpenseAmt = allExpenses
        .filter(e => {
          const expenseBranchId = e.branchId?._id ? e.branchId._id.toString() : e.branchId?.toString();
          return expenseBranchId === branchIdStr;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      branchStats.push({
        branchId: b._id,
        name: b.name,
        studentsCount: branchStudentsCount,
        expected: branchExpectedPeriod,
        collected: branchCollected,
        pending: Math.max(0, branchExpectedPeriod - branchCollected),
        expenses: branchExpenseAmt,
        net: branchCollected - branchExpenseAmt
      });
    }

    // Get top 5 recent fees in-memory
    const sortedPayments = [...feePayments].sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.createdAt).getTime();
      const dateB = new Date(b.transactionDate || b.createdAt).getTime();
      return dateB - dateA;
    });
    const recentFees = sortedPayments.slice(0, 5);

    return NextResponse.json({
      activeStudentsCount,
      totalStudentsCount,
      totalExpectedFees: totalExpectedPeriod,
      totalCollectedFees,
      totalPendingFees: Math.max(0, totalExpectedPeriod - totalCollectedFees),
      totalExpenses: role === 'admin' ? totalExpenses : null,
      netProfit: role === 'admin' ? (totalCollectedFees - totalExpenses) : null,
      branchStats,
      recentFees,
      recentExpenses: role === 'admin' ? expensesList : null,
      startDate,
      endDate
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
