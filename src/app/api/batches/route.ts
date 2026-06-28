import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import mongoose from 'mongoose';
import Batch from '@/models/Batch';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const filter: any = { isActive: true };
    if (branchId && mongoose.isValidObjectId(branchId)) {
      filter.branchId = branchId;
    }

    const batches = await Batch.find(filter).sort({ name: 1 }).lean();
    return NextResponse.json(batches);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();
    const { branchId, name, timing, days } = await req.json();

    if (!branchId || !name) {
      return NextResponse.json({ error: 'Branch ID and Batch name are required' }, { status: 400 });
    }

    const batch = await Batch.create({ branchId, name, timing, days });
    return NextResponse.json(batch, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
