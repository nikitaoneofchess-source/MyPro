import { FastifyInstance } from 'fastify';
import { ScheduleTemplate } from '../models/ScheduleTemplate.js';
import { User } from '../models/User.js';
import { generateSessionsFromTemplates } from '../services/generator.service.js';

export async function templateRoutes(fastify: FastifyInstance) {
  
  // Створити новий шаблон
  fastify.post('/templates', async (request, reply) => {
    const { coachTgId, clientId, daysOfWeek, startTime, duration } = request.body as any;

    try {
      const coach = await User.findOne({ tgId: coachTgId });
      if (!coach) return reply.status(404).send({ error: 'Тренера не знайдено' });

      // 1. Створюємо шаблон у базі
      const template = await ScheduleTemplate.create({
        coachId: coach._id,
        clientId,
        daysOfWeek,
        startTime,
        duration: duration || 60,
        isActive: true
      });

      // 2. МИТТЄВА ГЕНЕРАЦІЯ
      // Передаємо щойно створений документ у генератор
      await generateSessionsFromTemplates(template);

      return template;
    } catch (e) {
      console.error(e);
      return reply.status(500).send({ error: 'Помилка створення шаблону' });
    }
  });

  // Отримати шаблони тренера
  fastify.get('/templates/:coachTgId', async (request, reply) => {
    const { coachTgId } = request.params as { coachTgId: string };
    const coach = await User.findOne({ tgId: Number(coachTgId) });
    if (!coach) return reply.status(404).send({ error: 'Тренера не знайдено' });

    const templates = await ScheduleTemplate.find({ coachId: coach._id, isActive: true })
        .populate('clientId', 'firstName lastName');
        
    return { templates };
  });
}