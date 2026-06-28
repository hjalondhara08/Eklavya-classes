import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import FeePayment from '@/models/FeePayment';
import FeeRecord from '@/models/FeeRecord';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    const filter: any = {};

    // Only trust a well-formed ObjectId for studentId (avoids injection / 500s).
    if (studentId && /^[0-9a-fA-F]{24}$/.test(studentId)) {
      filter.studentId = studentId;
    }

    // Build the month filter from validated values — never interpolate raw input
    // into a regex.
    if (year && /^\d{4}$/.test(year)) {
      filter.feeMonth = { $gte: `${year}-01`, $lte: `${year}-12` };
    } else if (month && /^\d{4}-\d{2}$/.test(month)) {
      filter.feeMonth = month;
    }

    const payments = await FeePayment.find(filter)
      .populate({
        path: 'studentId',
        select: 'name mobileNumber parentMobile mobile monthlyFee yearlyFees standard joinDate branchId batchId',
        populate: [
          { path: 'branchId', select: 'name' },
          { path: 'batchId', select: 'name timing' }
        ]
      })
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { studentId, feeMonth, amount, paymentType, transactionDate, notes } = body;

    if (!studentId || !feeMonth || amount === undefined || !paymentType || !transactionDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }



    const payment = await FeePayment.create({
      studentId,
      feeMonth,
      amount: Number(amount),
      paymentType,
      transactionDate: new Date(transactionDate),
      notes,
      createdBy: session.user.id,
    });

    // --- Update/Upsert FeeRecord for the paid month to prevent mismatch ---
    const [yStr, mStr] = feeMonth.split('-');
    const yearNum = parseInt(yStr);
    const monthNum = parseInt(mStr);

    const record = await FeeRecord.findOne({ studentId, year: yearNum, month: monthNum });
    if (record) {
      const newPaid = record.amountPaid + Number(amount);
      const newStatus = newPaid >= record.amountDue ? 'paid' : (newPaid > 0 ? 'partial' : 'due');
      record.amountPaid = newPaid;
      record.status = newStatus;
      record.paidOn = new Date(transactionDate);
      await record.save();
    } else {
      const newStatus = Number(amount) >= student.monthlyFee ? 'paid' : (Number(amount) > 0 ? 'partial' : 'due');
      await FeeRecord.create({
        studentId,
        year: yearNum,
        month: monthNum,
        amountDue: student.monthlyFee,
        amountPaid: Number(amount),
        status: newStatus,
        paidOn: new Date(transactionDate)
      });
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
