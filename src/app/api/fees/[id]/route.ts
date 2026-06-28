import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import FeePayment from '@/models/FeePayment';
import FeeRecord from '@/models/FeeRecord';
import Student from '@/models/Student';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const payment = await FeePayment.findById(params.id);
    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }


    // --- Revert/Decrement FeeRecord amount ---
    if (payment.feeMonth) {
      const [yStr, mStr] = payment.feeMonth.split('-');
      const yearNum = parseInt(yStr);
      const monthNum = parseInt(mStr);

      const record = await FeeRecord.findOne({ studentId: payment.studentId, year: yearNum, month: monthNum });
      if (record) {
        const newPaid = Math.max(0, record.amountPaid - payment.amount);
        const newStatus = newPaid >= record.amountDue ? 'paid' : (newPaid > 0 ? 'partial' : 'due');
        record.amountPaid = newPaid;
        record.status = newStatus;
        await record.save();
      }
    }

    await FeePayment.findByIdAndDelete(params.id);

    return NextResponse.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
