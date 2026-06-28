import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const filter: any = {};
    if (session.user.role === 'operator') {
      if (!session.user.branchId) {
         return NextResponse.json({ error: 'Operator has no branch assigned' }, { status: 403 });
      }
      filter.branchId = session.user.branchId;
    }

    const students = await Student.find(filter)
      .select('name rollNo batchId joinDate isActive mobile')
      .populate('batchId', 'name')
      .sort({ name: 1 });

    return NextResponse.json(students);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
