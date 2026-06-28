import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeeRecord from '@/models/FeeRecord';
import FeePayment from '@/models/FeePayment';
import Expense from '@/models/Expense';
import Branch from '@/models/Branch';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const branchId = searchParams.get('branchId');
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const month = searchParams.get('month');
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    // ── PROFIT & LOSS ──
    if (type === 'profit') {
      const startDate = startDateParam ? new Date(startDateParam) : new Date('2026-05-01T00:00:00Z');
      const endDate = endDateParam ? new Date(endDateParam) : new Date('2027-04-30T23:59:59.999Z');
      if (endDateParam) {
        endDate.setHours(23, 59, 59, 999);
      }

      const feeFilter: any = { transactionDate: { $gte: startDate, $lte: endDate } };
      if (branchId) {
        const branchStudents = await Student.find({ branchId }).select('_id');
        feeFilter.studentId = { $in: branchStudents.map(s => s._id) };
      }

      const feePayments = await FeePayment.find(feeFilter);
      const totalFees = feePayments.reduce((sum, p) => sum + p.amount, 0);

      const expenseFilter: any = { transactionDate: { $gte: startDate, $lte: endDate } };
      if (branchId) expenseFilter.branchId = branchId;

      const expenses = await Expense.find(expenseFilter);
      const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

      return NextResponse.json({ totalFees, totalExpenses, netProfit: totalFees - totalExpenses, startDate, endDate });
    }

    // ── YEARLY COLLECTION (FeeRecord, academic May→Apr) ──
    if (type === 'yearly-collection') {
      const endYear = parseInt(year);
      const startYear = endYear - 1;

      // Academic months in order
      const academicSlots: { year: number; month: number; key: string }[] = [];
      for (let m = 5; m <= 12; m++) {
        academicSlots.push({ year: startYear, month: m, key: `${startYear}-${m < 10 ? '0' + m : m}` });
      }
      for (let m = 1; m <= 4; m++) {
        academicSlots.push({ year: endYear, month: m, key: `${endYear}-${m < 10 ? '0' + m : m}` });
      }

      const matchFilter: any = {
        status: { $in: ['paid', 'partial'] },
        $or: [
          { year: startYear, month: { $gte: 5 } },
          { year: endYear, month: { $lte: 4 } }
        ]
      };
      if (branchId) {
        const branchStudents = await Student.find({ branchId }).select('_id');
        matchFilter.studentId = { $in: branchStudents.map(s => s._id) };
      }

      const records = await FeeRecord.find(matchFilter);

      const collections: { [key: string]: number } = {};
      for (const slot of academicSlots) collections[slot.key] = 0;
      for (const rec of records) {
        const key = `${rec.year}-${rec.month < 10 ? '0' + rec.month : rec.month}`;
        if (collections[key] !== undefined) collections[key] += rec.amountPaid || 0;
      }

      return NextResponse.json({ year: `${startYear}-${endYear}`, collections });
    }

    // ── MONTHLY COLLECTION ──
    if (type === 'monthly-collection') {
      if (!month) return NextResponse.json({ error: 'Month parameter required (YYYY-MM)' }, { status: 400 });

      const payments = await FeePayment.find({ feeMonth: month }).populate({
        path: 'studentId', select: 'name branchId batchId monthlyFee',
        populate: [{ path: 'branchId', select: 'name' }, { path: 'batchId', select: 'name' }]
      });

      const breakdown: any = {};
      for (const p of payments) {
        const student = p.studentId as any;
        if (!student) continue;
        const bName = student.branchId?.name || 'Unknown Branch';
        const batchName = student.batchId?.name || 'Unknown Batch';
        if (!breakdown[bName]) breakdown[bName] = { total: 0, batches: {} };
        if (!breakdown[bName].batches[batchName]) breakdown[bName].batches[batchName] = 0;
        breakdown[bName].total += p.amount;
        breakdown[bName].batches[batchName] += p.amount;
      }
      return NextResponse.json({ month, breakdown });
    }

    // ── EXPENSES ──
    if (type === 'expenses') {
      const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = endDateParam ? new Date(endDateParam) : new Date();
      endDate.setHours(23, 59, 59, 999);
      const filter: any = { transactionDate: { $gte: startDate, $lte: endDate } };
      if (branchId) filter.branchId = branchId === 'general' ? null : branchId;

      const expenses = await Expense.find(filter).populate('branchId', 'name').sort({ transactionDate: -1 });
      const categoryTotals: { [key: string]: number } = {};
      let totalAmount = 0;
      for (const e of expenses) {
        categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
        totalAmount += e.amount;
      }
      return NextResponse.json({ totalAmount, categoryTotals, expenses });
    }

    // ── STUDENT DEMOGRAPHICS ──
    if (type === 'students') {
      const activeCount = await Student.countDocuments({ isActive: true });
      const inactiveCount = await Student.countDocuments({ isActive: false });

      const branchBreakdown = await Student.aggregate([
        { $match: { isActive: true } }, { $group: { _id: '$branchId', count: { $sum: 1 } } }
      ]);
      const populatedBranchBreakdown = await Branch.populate(branchBreakdown, { path: '_id', select: 'name' });

      const standardBreakdown = await Student.aggregate([
        { $match: { isActive: true } }, { $group: { _id: '$standard', count: { $sum: 1 } } }, { $sort: { _id: 1 } }
      ]);

      return NextResponse.json({
        activeCount, inactiveCount,
        branchBreakdown: populatedBranchBreakdown.map(b => ({ branchName: b._id?.name || 'Unknown', count: b.count })),
        standardBreakdown: standardBreakdown.map(s => ({ standard: s._id, count: s.count }))
      });
    }

    // ── PENDING FEES (Simple Yearly Fees remaining balance) ──
    if (type === 'pending') {
      const batchId = searchParams.get('batchId');
      const standard = searchParams.get('standard');
      const search = searchParams.get('search');

      const studentFilter: any = { isActive: true };
      if (branchId && /^[0-9a-fA-F]{24}$/.test(branchId)) studentFilter.branchId = branchId;
      if (batchId && /^[0-9a-fA-F]{24}$/.test(batchId)) studentFilter.batchId = batchId;
      if (standard) studentFilter.standard = standard;
      if (search) {
        // Escape regex metacharacters + cap length to avoid ReDoS / injection.
        const safe = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        studentFilter.name = { $regex: safe, $options: 'i' };
      }

      const students = await Student.find(studentFilter)
        .populate('branchId', 'name')
        .populate('batchId', 'name')
        .sort({ name: 1 })
        .lean();

      const studentIds = (students as any[]).map(s => s._id);

      // Fetch fee payments for these students
      const payments = studentIds.length > 0 ? await FeePayment.find({
        studentId: { $in: studentIds }
      }).lean() : [];

      const paymentsMap: Record<string, number> = {};
      payments.forEach(p => {
        const studentIdStr = p.studentId.toString();
        paymentsMap[studentIdStr] = (paymentsMap[studentIdStr] || 0) + (p.amount || 0);
      });

      const pendingList: any[] = [];
      let grandTotalDue = 0;

      for (const s of students as any[]) {
        const totalPaidAmount = paymentsMap[s._id.toString()] || 0;
        const pendingAmount = Math.max(0, (s.yearlyFees || 0) - totalPaidAmount);

        if (pendingAmount > 0) {
          pendingList.push({
            studentId: s._id,
            name: s.name,
            mobileNumber: s.mobileNumber || s.mobile || '',
            parentMobile: s.parentMobile || '',
            branchName: (s.branchId as any)?.name || 'Unknown',
            batchName: (s.batchId as any)?.name || 'Unknown',
            yearlyFees: s.yearlyFees || 0,
            totalPaidAmount,
            pendingAmount
          });
          grandTotalDue += pendingAmount;
        }
      }

      pendingList.sort((a, b) => b.pendingAmount - a.pendingAmount);
      return NextResponse.json({
        students: pendingList,
        grandTotalDue,
        studentCountWithDues: pendingList.length
      });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
