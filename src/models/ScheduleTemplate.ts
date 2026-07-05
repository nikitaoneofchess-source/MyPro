import { Schema, model, Document, Types } from 'mongoose';

export interface IScheduleTemplate extends Document {
  coachId: Types.ObjectId;
  clientId: Types.ObjectId;
  daysOfWeek: number[]; // [1, 3, 5] где 1 - Пн, 7 - Вс
  startTime: string;    // "10:00"
  duration: number;     // Длительность в минутах (например, 60)
  isActive: boolean;
  createdAt: Date;
}

const ScheduleTemplateSchema = new Schema<IScheduleTemplate>({
  coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  daysOfWeek: { type: [Number], required: true }, // Массив дней
  startTime: { type: String, required: true },    // "10:00"
  duration: { type: Number, default: 60 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export const ScheduleTemplate = model<IScheduleTemplate>('ScheduleTemplate', ScheduleTemplateSchema);