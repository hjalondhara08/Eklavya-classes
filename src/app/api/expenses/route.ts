import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Expense from '@/models/Expense';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const filter: any = {};

    if (branchId) {
      if (branchId === 'general') {
        filter.branchId = null;
      } else {
        filter.branchId = branchId;
      }
    }

    if (category) {
      filter.category = category;
    }

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) {
        filter.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.transactionDate.$lte = new Date(endDate);
      }
    }

    const expenses = await Expense.find(filter)
      .populate('branchId', 'name')
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1, createdAt: -1 });

    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { branchId, category, name, amount, transactionDate, notes } = body;

    if (!category || !name || amount === undefined || !transactionDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const expense = await Expense.create({
      branchId: branchId === 'general' || !branchId ? null : branchId,
      category,
      name,
      amount: Number(amount),
      transactionDate: new Date(transactionDate),
      notes,
      createdBy: session.user.id,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
