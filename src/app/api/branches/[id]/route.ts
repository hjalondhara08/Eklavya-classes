import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Branch from '@/models/Branch';
import Student from '@/models/Student';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const branch = await Branch.findById(params.id).lean();
    if (!branch) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    return NextResponse.json(branch);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();
    const { name, phone, address } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
    }

    const updated = await Branch.findByIdAndUpdate(
      params.id,
      { name: name.trim(), phone: phone?.trim() || undefined, address: address?.trim() || undefined },
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    return NextResponse.json(updated);
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

    // Check if any active students are in this branch
    const studentCount = await Student.countDocuments({ branchId: params.id, isActive: true });
    if (studentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: ${studentCount} active student(s) still assigned to this branch. Transfer or deactivate them first.` },
        { status: 400 }
      );
    }

    const deleted = await Branch.findByIdAndUpdate(params.id, { isActive: false }, { new: true });
    if (!deleted) return NextResponse.json({ error: 'Branch not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Branch deactivated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
