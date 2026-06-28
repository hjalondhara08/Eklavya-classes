import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Batch from '@/models/Batch';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // 1. Fetch all active branches
    let branches = (await Branch.find({ isActive: true }).sort({ name: 1 }).lean()) as any[];

    if (session.user.role !== 'admin' && session.user.branchId) {
      branches = branches.filter((b: any) => b._id.toString() === session.user.branchId);
    }

    const branchIds = branches.map((b: any) => b._id);

    // 2. Fetch ALL batches for all branches in ONE query
    const allBatches = (await Batch.find({ branchId: { $in: branchIds }, isActive: true }).lean()) as any[];

    // 3. Fetch student counts grouped by batchId in ONE aggregation (instead of N queries)
    const studentCounts = await Student.aggregate([
      { $match: { batchId: { $in: allBatches.map((b: any) => b._id) }, isActive: true } },
      { $group: { _id: '$batchId', count: { $sum: 1 } } }
    ]);

    // Build a map: batchId → count
    const countMap: Record<string, number> = {};
    for (const sc of studentCounts) {
      countMap[sc._id.toString()] = sc.count;
    }

    // Natural numeric sort: 6E1, 7E1, 8E1 ...
    const naturalSort = (a: string, b: string) => {
      const numA = parseInt(a.match(/^(\d+)/)?.[1] ?? '0', 10);
      const numB = parseInt(b.match(/^(\d+)/)?.[1] ?? '0', 10);
      if (numA !== numB) return numA - numB;
      return a.localeCompare(b);
    };

    // 4. Assemble hierarchy in-memory (no more DB calls per batch)
    const branchMap: Record<string, any> = {};
    for (const branch of branches) {
      branchMap[branch._id.toString()] = {
        ...branch,
        batches: []
      };
    }

    for (const batch of allBatches) {
      const bId = batch.branchId.toString();
      if (branchMap[bId]) {
        branchMap[bId].batches.push({
          ...batch,
          studentsCount: countMap[batch._id.toString()] || 0,
          students: [] // not loaded here — loaded on demand when batch is clicked
        });
      }
    }

    // Sort batches numerically within each branch
    const hierarchy = branches.map((b: any) => {
      const entry = branchMap[b._id.toString()];
      entry.batches.sort((a: any, c: any) => naturalSort(a.name, c.name));
      return entry;
    });

    return NextResponse.json(hierarchy);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
