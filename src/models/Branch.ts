import mongoose, { Schema, Document, model, models } from 'mongoose';

export interface IBranch extends Document {
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BranchSchema = new Schema<IBranch>(
  {
    name: { type: String, required: true },
    address: { type: String },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.Branch || model<IBranch>('Branch', BranchSchema);
