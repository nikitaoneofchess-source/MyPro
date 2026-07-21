import { FastifyInstance } from 'fastify';
import { User } from '../models/User.js';

export async function userRoutes(fastify: FastifyInstance) {
  // Список дозволених ID (ти та твій друг)
  const ALLOWED_IDS = [1099007629, 764163998];

  // 1. Отримати дані конкретного юзера
  fastify.get('/users/:tgId', async (request, reply) => {
    const { tgId } = request.params as { tgId: string };
    const idNum = Number(tgId);

    // Перевірка: чи є цей ID у білому списку
    if (!ALLOWED_IDS.includes(idNum)) {
      return reply.status(403).send({ error: 'Access Denied: You are not an authorized coach' });
    }

    try {
      const user = await User.findOne({ tgId: idNum });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      return user;
    } catch (e) {
      return reply.status(500).send({ error: 'Database error' });
    }
  });

  // 2. Отримати список клієнтів для тренера
  fastify.get('/clients/:coachTgId', async (request, reply) => {
    const { coachTgId } = request.params as { coachTgId: string };
    const idNum = Number(coachTgId);

    // Перевірка: чи дозволено цьому ID бачити список клієнтів
    if (!ALLOWED_IDS.includes(idNum)) {
      return reply.status(403).send({ error: 'Access Denied' });
    }

    try {
      const coach = await User.findOne({ tgId: idNum, role: 'coach' });
      
      if (!coach) {
        return reply.status(404).send({ error: 'Coach not found in database' });
      }

      // Шукаємо всіх клієнтів, які прив'язані до знайденого тренера
      const clients = await User.find({ coachId: coach._id, role: 'client' });
      
      return { clients };
    } catch (error) {
      return reply.status(500).send({ error: 'Server error during fetching clients' });
    }
  });
}