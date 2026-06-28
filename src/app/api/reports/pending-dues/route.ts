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
          status: { $in: ['due', 'partial'] }
        }
      },
      {
        $group: {
          _id: '$studentId',
          totalDue: { $sum: { $subtract: ['$amountDue', '$amountPaid'] } }
        }
      },
      {
        $lookup: {
          from: 'students',
          localField: '_id',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $unwind: '$student'
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'student.branchId',
          foreignField: '_id',
          as: 'branch'
        }
      },
      {
        $unwind: { path: '$branch', preserveNullAndEmptyArrays: true }
      },
      {
        $lookup: {
          from: 'batches',
          localField: 'student.batchId',
          foreignField: '_id',
          as: 'batch'
        }
      },
      {
        $unwind: { path: '$batch', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          _id: 1,
          name: '$student.name',
          branchName: '$branch.name',
          batchName: '$batch.name',
          totalDue: 1
        }
      },
      {
        $sort: { totalDue: -1 }
      }
    ];

    const result = await FeeRecord.aggregate(pipeline as any[]);

    return NextResponse.json(result);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
