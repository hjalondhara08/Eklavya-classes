import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';
import FeeRecord from '@/models/FeeRecord';
import FeePayment from '@/models/FeePayment';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const student = await Student.findById(params.id)
      .populate('branchId', 'name')
      .populate('batchId', 'name timing days');

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }



    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const student = await Student.findById(params.id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }



    const body = await req.json();
    const { branchId, batchId, name, mobile, parentMobile, standard, monthlyFee, yearlyFees, joinDate, notes, isActive } = body;

    if (isActive !== undefined && isActive !== student.isActive) {
      if (session.user.role !== 'admin' && session.user.role !== 'operator') {
        return NextResponse.json({ error: 'Only admins and operators can activate/deactivate students' }, { status: 403 });
      }
      student.isActive = isActive;
    }

    if (branchId && branchId !== student.branchId.toString()) {
      student.branchId = branchId;
    }

    if (batchId) student.batchId = batchId;
    if (name) student.name = name;
    if (mobile !== undefined) {
      student.mobile = mobile;
      student.mobileNumber = mobile;
    }
    if (parentMobile !== undefined) student.parentMobile = parentMobile;
    if (standard) student.standard = standard;
    
    if (yearlyFees !== undefined) {
      student.yearlyFees = yearlyFees;
      student.monthlyFee = Math.round(yearlyFees / 12);
    } else if (monthlyFee !== undefined) {
      student.monthlyFee = monthlyFee;
      student.yearlyFees = monthlyFee * 12;
    }

    if (joinDate) student.joinDate = new Date(joinDate);
    if (notes !== undefined) student.notes = notes;

    await student.save();

    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can permanently delete a student
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Only administrators can permanently delete students' }, { status: 403 });
    }

    await connectToDatabase();

    const student = await Student.findById(params.id);
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const studentId = student._id;

    // Cascade delete: remove all fee records and payments linked to this student
    await FeeRecord.deleteMany({ studentId });
    await FeePayment.deleteMany({ studentId });

    // Finally, delete the student document
    await Student.findByIdAndDelete(studentId);

    return NextResponse.json({
      success: true,
      message: `Student "${student.name}" and all related fee data have been permanently deleted.`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
