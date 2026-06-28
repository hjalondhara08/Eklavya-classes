import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import { applyPayment } from '@/lib/utils/feeRecords';
import FeePayment from '@/models/FeePayment';

import Student from '@/models/Student';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const body = await req.json();
    const { studentId, year, month, amount, paymentType, transactionDate, notes } = body;

    if (!studentId || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }


    // Call the new greedy distribution logic
    const paymentResult = await applyPayment(studentId, Number(amount));

    // Also log it into FeePayment history so reports work as expected
    const feeMonth = year && month ? `${year}-${month < 10 ? '0' + month : month}` : new Date().toISOString().slice(0, 7);

    const paymentLog = await FeePayment.create({
      studentId,
      feeMonth,
      amount: Number(amount),
      paymentType: paymentType || 'full',
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes,
      createdBy: session.user.id,
    });

    return NextResponse.json({ success: true, paymentResult, paymentLog }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
