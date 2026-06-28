import { NextResponse, NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import Expense from '@/models/Expense';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admins only.' }, { status: 401 });
    }

    await connectToDatabase();

    const body = await req.json();
    const { branchId, category, name, amount, transactionDate, notes } = body;

    const expense = await Expense.findById(params.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    if (branchId !== undefined) {
      expense.branchId = branchId === 'general' || !branchId ? null : branchId;
    }
    if (category) expense.category = category;
    if (name) expense.name = name;
    if (amount !== undefined) expense.amount = Number(amount);
    if (transactionDate) expense.transactionDate = new Date(transactionDate);
    if (notes !== undefined) expense.notes = notes;

    await expense.save();

    return NextResponse.json(expense);
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

    const expense = await Expense.findByIdAndDelete(params.id);
    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
