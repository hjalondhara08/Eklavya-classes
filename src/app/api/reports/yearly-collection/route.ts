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
    const { searchParams } = new URL(req.url);
    const yearParam = searchParams.get('year');
    const startYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    const endYear = startYear + 1;

    // We want records from May of startYear to April of endYear
    const pipeline = [
      {
        $match: {
          status: { $ne: 'na' },
          $or: [
            { year: startYear, month: { $gte: 5 } },
            { year: endYear, month: { $lte: 4 } }
          ]
        }
      },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: '$amountDue' },
          totalCollected: {
            $sum: {
              $cond: [{ $in: ['$status', ['paid', 'partial']] }, '$amountPaid', 0]
            }
          },
          totalPending: {
            $sum: {
              $cond: [{ $in: ['$status', ['due', 'partial']] }, { $subtract: ['$amountDue', '$amountPaid'] }, 0]
            }
          }
        }
      }
    ];

    const result = await FeeRecord.aggregate(pipeline);
    const data = result[0] || { totalExpected: 0, totalCollected: 0, totalPending: 0 };
    const collectionRate = data.totalExpected > 0 ? (data.totalCollected / data.totalExpected) * 100 : 0;

    return NextResponse.json({
      year: startYear,
      ...data,
      collectionRate
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
