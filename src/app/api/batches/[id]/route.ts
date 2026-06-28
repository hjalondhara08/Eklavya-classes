import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Batch from '@/models/Batch';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();
    const { name, timing, days } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Batch name is required' }, { status: 400 });
    }

    const batch = await Batch.findById(params.id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    batch.name = name.trim();
    if (timing !== undefined) batch.timing = timing.trim();
    if (days !== undefined) batch.days = days.trim();

    await batch.save();
    return NextResponse.json(batch);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();
    const batch = await Batch.findById(params.id);
    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
    }

    // Soft delete by setting isActive to false
    batch.isActive = false;
    await batch.save();

    return NextResponse.json({ message: 'Batch deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
