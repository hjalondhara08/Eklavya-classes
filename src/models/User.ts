import mongoose, { Schema, Document, model, models, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'operator';
  branchId: Types.ObjectId | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'operator'], default: 'operator' },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', UserSchema);
