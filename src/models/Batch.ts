import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IBatch extends Document {
  branchId: Types.ObjectId;
  name: string;
  timing?: string;
  days?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BatchSchema = new Schema<IBatch>(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    timing: { type: String },
    days: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Index for fast batch lookup per branch
BatchSchema.index({ branchId: 1, isActive: 1 });

export default models.Batch || model<IBatch>('Batch', BatchSchema);
