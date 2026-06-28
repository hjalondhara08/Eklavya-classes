import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import FeeRecord from '@/models/FeeRecord';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const pipeline = [
      {
        $match: {
          status: { $ne: 'na' }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $group: {
          _id: '$student.branchId',
          totalExpected: { $sum: '$amountDue' },
          totalCollected: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'partial']] }, '$amountPaid', 0]
            }
          }
        }
      },
      {
        $project: {
          branchId: '$_id',
          totalExpected: 1,
          totalCollected: 1,
          totalPending: { $subtract: ['$totalExpected', '$totalCollected'] }
        }
      }
    ];

    const result = await FeeRecord.aggregate(pipeline);

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
