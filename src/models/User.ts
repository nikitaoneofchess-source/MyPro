import { Schema, model, Types } from 'mongoose';

export interface IUser {
  tgId: number;
  role: 'coach' | 'client';
  firstName: string;
  lastName?: string;
  username?: string;
  coachId?: Types.ObjectId; 
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  tgId: { type: Number, required: true, unique: true },
  role: { type: String, enum: ['coach', 'client'], required: true },
  firstName: { type: String, required: true },
  lastName: String,
  username: String,
  coachId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export const User = model<IUser>('User', UserSchema);