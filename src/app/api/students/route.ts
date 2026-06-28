import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Student from '@/models/Student';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const batchId = searchParams.get('batchId');
    const standard = searchParams.get('standard');
    const search = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');

    const filter: any = {};

    if (branchId) {
      filter.branchId = branchId;
    }

    if (batchId) {
      filter.batchId = batchId;
    }

    if (standard) {
      filter.standard = standard;
    }

    if (isActiveParam !== null && isActiveParam !== undefined) {
      filter.isActive = isActiveParam === 'true';
    } else {
      filter.isActive = true;
    }

    if (search) {
      // Escape regex metacharacters and cap length to prevent ReDoS / injection
      const safe = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: safe, $options: 'i' };
    }

    const students = await Student.find(filter)
      .populate('branchId', 'name')
      .populate('batchId', 'name timing')
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(students);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { branchId, batchId, name, mobileNumber, parentMobile, standard, yearlyFees, joinDate, notes } = body;

    if (!branchId || !batchId || !name || !standard || yearlyFees === undefined || !joinDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await Student.create({
      branchId,
      batchId,
      name,
      mobile: mobileNumber,
      mobileNumber,
      parentMobile,
      standard,
      yearlyFees,
      monthlyFee: Math.round(yearlyFees / 12),
      joinDate: new Date(joinDate),
      notes,
      isActive: true,
    });

    return NextResponse.json(student, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
