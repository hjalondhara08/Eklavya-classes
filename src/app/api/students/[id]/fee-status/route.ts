import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import FeePayment from '@/models/FeePayment';
import Student from '@/models/Student';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const studentObj = await Student.findById(params.id);
    if (!studentObj) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Fetch payments for this student sorted by transactionDate descending (LIFO)
    const payments = await FeePayment.find({ studentId: params.id })
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1, createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
