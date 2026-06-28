import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IFeePayment extends Document {
  studentId: Types.ObjectId;
  feeMonth: string; // Format: YYYY-MM
  amount: number;
  paymentType: 'full' | 'partial' | 'extra' | 'discount' | 'late_fee';
  transactionDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    feeMonth: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentType: {
      type: String,
      required: true,
    },
    transactionDate: { type: Date, required: true },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

FeePaymentSchema.index({ transactionDate: 1 });
FeePaymentSchema.index({ studentId: 1 });
FeePaymentSchema.index({ feeMonth: 1 });
// Serves per-student payment history sorted newest-first (fee-status, receipts).
FeePaymentSchema.index({ studentId: 1, transactionDate: -1 });

export default models.FeePayment || model<IFeePayment>('FeePayment', FeePaymentSchema);
