import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeeRecord from '@/models/FeeRecord';
import FeePayment from '@/models/FeePayment';

// PATCH /api/students/bulk — bulk status change (activate / deactivate)
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin' && session.user.role !== 'operator') {
      return NextResponse.json({ error: 'Only admins/operators can change student status' }, { status: 403 });
    }

    await connectToDatabase();

    const { ids, isActive } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive (boolean) is required' }, { status: 400 });
    }

    const result = await Student.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} student(s) updated to ${isActive ? 'Active' : 'Inactive'}.`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/students/bulk — cascade hard-delete multiple students
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can permanently delete students' }, { status: 403 });
    }

    await connectToDatabase();

    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
    }

    // Cascade: delete all fee data first, then delete students
    await FeeRecord.deleteMany({ studentId: { $in: ids } });
    await FeePayment.deleteMany({ studentId: { $in: ids } });
    const result = await Student.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} student(s) and all related fee data permanently deleted.`,
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
