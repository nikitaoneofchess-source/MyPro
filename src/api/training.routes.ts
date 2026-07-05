import { FastifyInstance } from 'fastify';
import { TrainingSession } from '../models/TrainingSession.js';
import { User } from '../models/User.js';

export async function trainingRoutes(fastify: FastifyInstance) {
  
  // 1. Получить все тренировки тренера (для календаря)
  fastify.get('/trainings/:coachTgId', async (request, reply) => {
    const { coachTgId } = request.params as { coachTgId: string };

    try {
      const coach = await User.findOne({ tgId: Number(coachTgId), role: 'coach' });
      if (!coach) return reply.status(404).send({ error: 'Тренер не найден' });

      const sessions = await TrainingSession.find({ coachId: coach._id })
        .populate('clientId', 'firstName lastName') // Подтягиваем инфо о клиенте
        .sort({ startAt: 1 });

      return { sessions };
    } catch (e) {
      return reply.status(500).send({ error: 'Ошибка при получении тренировок' });
    }
  });

  // Видалити тренування (звільнити слот)
  fastify.delete('/trainings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await TrainingSession.findByIdAndDelete(id);
      return { success: true };
    } catch (e) {
      return reply.status(500).send({ error: 'Помилка видалення' });
    }
  });

  // 2. Создать новую разовую тренировку
  fastify.post('/trainings', async (request, reply) => {
    const { coachTgId, clientId, startAt, durationMinutes } = request.body as {
      coachTgId: number;
      clientId: string; // Это MongoDB _id клиента
      startAt: string;  // ISO дата
      durationMinutes: number;
    };

    try {
      const coach = await User.findOne({ tgId: coachTgId, role: 'coach' });
      if (!coach) return reply.status(404).send({ error: 'Тренер не найден' });

      const startDate = new Date(startAt);
      const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

      const newSession = await TrainingSession.create({
        coachId: coach._id,
        clientId,
        startAt: startDate,
        endAt: endDate,
        status: 'planned'
      });

      return { success: true, session: newSession };
    } catch (e) {
      return reply.status(500).send({ error: 'Ошибка при создании тренировки' });
    }
  });

  fastify.patch('/trainings/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status, attendance, clientId, startAt } = request.body as any;

    try {
      const session = await TrainingSession.findByIdAndUpdate(
        id, 
        { status, attendance, clientId, startAt }, 
        { new: true }
      );
      return session;
    } catch (e) {
      return reply.status(500).send({ error: 'Помилка оновлення' });
    }
  });

  // Отримати всі тренування конкретного клієнта
  fastify.get('/trainings/client/:clientId', async (request, reply) => {
    const { clientId } = request.params as { clientId: string };

    try {
      const sessions = await TrainingSession.find({ clientId })
        .sort({ startAt: 1 }); // Змінили з -1 на 1 (тепер від старих до нових)

      return { sessions };
    } catch (e) {
      return reply.status(500).send({ error: 'Помилка отримання даних клієнта' });
    }
  });
}