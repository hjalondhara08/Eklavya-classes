import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IExpense extends Document {
  branchId: Types.ObjectId | null; // null = general expense
  category: 'Rent' | 'Electricity' | 'Staff Salary' | 'Internet' | 'Marketing' | 'Other';
  name: string;
  amount: number;
  transactionDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    category: {
      type: String,
      enum: ['Rent', 'Electricity', 'Staff Salary', 'Internet', 'Marketing', 'Other'],
      required: true,
    },
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    transactionDate: { type: Date, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ExpenseSchema.index({ transactionDate: 1 });
// Serves branch-scoped expense listings filtered by date.
ExpenseSchema.index({ branchId: 1, transactionDate: -1 });

export default models.Expense || model<IExpense>('Expense', ExpenseSchema);
