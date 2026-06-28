import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IStudent extends Document {
  branchId: Types.ObjectId;
  batchId: Types.ObjectId;
  name: string;
  mobile?: string;
  mobileNumber: string;
  parentMobile?: string;
  standard: string;
  monthlyFee?: number;
  yearlyFees: number;
  joinDate: Date;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    name: { type: String, required: true },
    mobile: { type: String },
    mobileNumber: { type: String, required: true, default: '' },
    parentMobile: { type: String },
    standard: { type: String, required: true },
    monthlyFee: { type: Number, default: 0 },
    yearlyFees: { type: Number, required: true, default: 0 },
    joinDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String },
  },
  { timestamps: true }
);

// Indexes for all frequent query patterns
StudentSchema.index({ batchId: 1, isActive: 1 });   // hierarchy + batch details
StudentSchema.index({ branchId: 1, isActive: 1 });  // branch-level queries
StudentSchema.index({ name: 'text' });               // search by name
StudentSchema.index({ standard: 1, branchId: 1 });  // filter by standard

export default models.Student || model<IStudent>('Student', StudentSchema);
