import { User } from '../models/User';

import { verifyTelegramData } from '../services/auth.service';

export async function userRoutes(fastify: any) {
  fastify.get('/clients', async (request: any, reply: any) => {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return reply.status(401).send({ error: 'Unauthorized' });

    const initData = authHeader.replace('twa ', '');
    const { isValid, user } = verifyTelegramData(initData);

    if (!isValid) return reply.status(403).send({ error: 'Invalid data' });

    // ТЕПЕР МИ ВИКОРИСТОВУЄМО ID ПЕРЕВІРЕНОГО КОРИСТУВАЧА
    const coachTgId = user.id;

    try {
      const coach = await User.findOne({ tgId: coachTgId, role: 'coach' });
      if (!coach) return reply.status(404).send({ error: 'Coach not found' });

      const clients = await User.find({ coachId: coach._id, role: 'client' });
      return { clients };
    } catch (error) {
      return reply.status(500).send({ error: 'Server error' });
    }
  });
}