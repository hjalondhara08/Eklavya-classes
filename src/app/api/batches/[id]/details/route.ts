import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Batch from '@/models/Batch';
import Student from '@/models/Student';
import FeePayment from '@/models/FeePayment';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const batch = await Batch.findById(params.id).populate('branchId', 'name');
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    const students = await Student.find({ batchId: params.id, isActive: true })
      .select('name rollNo mobile mobileNumber parentMobile standard yearlyFees joinDate isActive')
      .sort({ name: 1 })
      .lean();

    const studentIds = students.map(s => s._id);

    // Fetch fee payments for these students
    const payments = studentIds.length > 0 ? await FeePayment.find({
      studentId: { $in: studentIds }
    }).lean() : [];

    const paymentsMap: Record<string, number> = {};
    payments.forEach(p => {
      const studentIdStr = p.studentId.toString();
      paymentsMap[studentIdStr] = (paymentsMap[studentIdStr] || 0) + (p.amount || 0);
    });

    let expected = 0;
    let collected = 0;

    const studentsWithStatus = students.map((s: any) => {
      const yearlyExpected = s.yearlyFees || 0;
      const yearlyPaid = paymentsMap[s._id.toString()] || 0;
      const yearlyPending = Math.max(0, yearlyExpected - yearlyPaid);
      const isPaid = yearlyPending <= 0;

      expected += yearlyExpected;
      collected += yearlyPaid;

      return {
        ...s,
        yearlyExpected,
        yearlyPaid,
        yearlyPending,
        isPaid
      };
    });

    const pending = expected - collected;

    return NextResponse.json({
      batch: {
        id: batch._id,
        name: batch.name,
        timing: batch.timing,
        days: batch.days,
        branchName: batch.branchId?.name
      },
      stats: {
        studentsCount: students.length,
        expected,
        collected,
        pending
      },
      students: studentsWithStatus
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
