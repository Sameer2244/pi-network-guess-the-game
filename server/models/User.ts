import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  uid: string;
  username: string;
  coins: number;
  xp: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  uid: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  coins: { type: Number, default: 0 },
  xp: { type: Number, default: 0 }
}, {
  timestamps: true 
});

export const User = mongoose.model<IUser>('User', UserSchema);
