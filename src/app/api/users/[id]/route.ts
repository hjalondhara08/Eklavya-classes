import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { name, email, password, branchId, isActive } = body;

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.email === 'admin@eklavya.in' && isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate system administrator' }, { status: 400 });
    }

    if (name) user.name = name;
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase(), _id: { $ne: params.id } });
      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
      user.email = email.toLowerCase();
    }
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }
    if (branchId !== undefined) {
      user.branchId = branchId || null;
    }
    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    const userObj = user.toObject();
    delete userObj.password;

    return NextResponse.json(userObj);
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

    const user = await User.findById(params.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Protect the primary system administrator from deletion.
    if (user.email === 'admin@eklavya.in') {
      return NextResponse.json({ error: 'The system administrator account cannot be deleted.' }, { status: 400 });
    }

    // Prevent an admin from deleting their own logged-in account.
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'You cannot delete your own account while logged in.' }, { status: 400 });
    }

    await User.deleteOne({ _id: params.id });

    return NextResponse.json({ success: true, message: 'Operator deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
