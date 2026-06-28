import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IFeeRecord extends Document {
  studentId: Types.ObjectId;
  year: number;
  month: number;
  status: 'paid' | 'partial' | 'due' | 'na';
  amountDue: number;
  amountPaid: number;
  paidOn?: Date;
  note?: string;
}

const FeeRecordSchema = new Schema<IFeeRecord>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    status: {
      type: String,
      enum: ['paid', 'partial', 'due', 'na'],
      required: true,
      default: 'due'
    },
    amountDue: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, required: true, default: 0 },
    paidOn: { type: Date },
    note: { type: String }
  },
  { timestamps: true }
);

FeeRecordSchema.index({ studentId: 1, year: 1, month: 1 }, { unique: true });
FeeRecordSchema.index({ year: 1, month: 1, status: 1 });

export default models.FeeRecord || model<IFeeRecord>('FeeRecord', FeeRecordSchema);
