import { Schema, model, Document, Types } from 'mongoose';

export interface IActivityLog extends Document {
  userId: Types.ObjectId;
  actionType: string; // 'session_created', 'client_confirmed', 'notification_sent'
  metadata: any;      // Любые доп. данные в формате JSON
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export const ActivityLog = model<IActivityLog>('ActivityLog', ActivityLogSchema);