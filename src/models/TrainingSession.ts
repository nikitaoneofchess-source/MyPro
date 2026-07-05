import { Schema, model, Document, Types } from 'mongoose';

export interface ITrainingSession extends Document {
  coachId: Types.ObjectId;
  clientId: Types.ObjectId;
  templateId?: Types.ObjectId; // Если создано по шаблону
  startAt: Date;               // Дата и время начала
  endAt: Date;                 // Дата и время конца
  status: 'planned' | 'confirmed' | 'cancelled' | 'completed';
  attendance: boolean;         // Был ли клиент по факту
  createdAt: Date;
}

const TrainingSessionSchema = new Schema<ITrainingSession>({
  coachId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  templateId: { type: Schema.Types.ObjectId, ref: 'ScheduleTemplate' },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['planned', 'confirmed', 'cancelled', 'completed'], 
    default: 'planned' 
  },
  attendance: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const TrainingSession = model<ITrainingSession>('TrainingSession', TrainingSessionSchema);