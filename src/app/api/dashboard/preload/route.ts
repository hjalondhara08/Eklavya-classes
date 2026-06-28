import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeePayment from '@/models/FeePayment';
import Expense from '@/models/Expense';
import Branch from '@/models/Branch';
import Batch from '@/models/Batch';

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

    // Run database queries in parallel for high performance
    const [branches, batches, allStudents, allExpenses, allPayments] = await Promise.all([
      Branch.find({ isActive: true }).lean(),
      Batch.find({ isActive: true }).lean(),
      Student.find(targetBranchId && targetBranchId !== 'general' ? { branchId: targetBranchId } : {}).lean(),
      role === 'admin' ? Expense.find({ transactionDate: { $gte: startDate, $lte: endDate } }).populate('branchId', 'name').lean() : [],
      FeePayment.find({ transactionDate: { $gte: startDate, $lte: endDate } }).populate('createdBy', 'name').lean()
    ]);

    // Build student maps
    const studentBranchMap = new Map<string, string>();
    const studentInfoMap = new Map<string, { name: string; standard: string; branchId: string; batchId: string }>();
    for (const s of allStudents as any[]) {
      if (s.branchId) {
        studentBranchMap.set(s._id.toString(), s.branchId.toString());
      }
      studentInfoMap.set(s._id.toString(), {
        name: s.name,
        standard: s.standard,
        branchId: s.branchId?.toString() || '',
        batchId: s.batchId?.toString() || ''
      });
    }

    // Process payments in-memory (map standard/branch/name info)
    const processedPayments = (allPayments as any[]).map(p => {
      const studInfo = studentInfoMap.get(p.studentId.toString());
      return {
        ...p,
        studentId: studInfo ? {
          _id: p.studentId,
          name: studInfo.name,
          standard: studInfo.standard,
          branchId: studInfo.branchId
        } : null
      };
    });

    // 1. Split active students
    const activeStudents = (allStudents as any[]).filter(s => s.isActive);
    const activeStudentsCount = activeStudents.length;
    const totalStudentsCount = allStudents.length;
    const totalExpectedPeriod = activeStudents.reduce((sum, s) => sum + (s.yearlyFees || 0), 0);

    // 2. Total collected fees
    const totalCollectedFees = processedPayments.reduce((sum, p) => sum + p.amount, 0);

    // 3. Process expenses
    let filteredExpenses = allExpenses as any[];
    if (targetBranchId) {
      if (targetBranchId === 'general') {
        filteredExpenses = (allExpenses as any[]).filter(e => !e.branchId);
      } else {
        filteredExpenses = (allExpenses as any[]).filter(e => e.branchId?._id?.toString() === targetBranchId || e.branchId?.toString() === targetBranchId);
      }
    }
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Get top 5 expenses sorted
    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.createdAt).getTime();
      const dateB = new Date(b.transactionDate || b.createdAt).getTime();
      return dateB - dateA;
    });
    const recentExpenses = sortedExpenses.slice(0, 5);

    // 4. Build branch stats
    const branchStats = [];
    for (const b of branches as any[]) {
      if (role === 'operator' && operatorBranchId && b._id.toString() !== operatorBranchId) {
        continue;
      }
      const branchIdStr = b._id.toString();

      const branchStudentsList = activeStudents.filter(s => s.branchId?.toString() === branchIdStr);
      const branchStudentsCount = branchStudentsList.length;
      const branchExpectedPeriod = branchStudentsList.reduce((sum, s) => sum + (s.yearlyFees || 0), 0);

      const branchCollected = processedPayments
        .filter(p => p.studentId?.branchId?.toString() === branchIdStr)
        .reduce((sum, p) => sum + p.amount, 0);

      const branchExpenseAmt = (allExpenses as any[])
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

    // Recent Payments
    const sortedPayments = [...processedPayments].sort((a, b) => {
      const dateA = new Date(a.transactionDate || a.createdAt).getTime();
      const dateB = new Date(b.transactionDate || b.createdAt).getTime();
      return dateB - dateA;
    });
    const recentFees = sortedPayments.slice(0, 5);

    return NextResponse.json({
      branches,
      batches,
      students: allStudents,
      payments: processedPayments,
      stats: {
        activeStudentsCount,
        totalStudentsCount,
        totalExpectedFees: totalExpectedPeriod,
        totalCollectedFees,
        totalPendingFees: Math.max(0, totalExpectedPeriod - totalCollectedFees),
        totalExpenses: role === 'admin' ? totalExpenses : null,
        netProfit: role === 'admin' ? (totalCollectedFees - totalExpenses) : null,
        branchStats,
        recentFees,
        recentExpenses: role === 'admin' ? recentExpenses : null,
        startDate,
        endDate
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
