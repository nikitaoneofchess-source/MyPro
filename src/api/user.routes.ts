import { FastifyInstance } from 'fastify';
import { User } from '../models/User';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.get('/users/:tgId', async (request, reply) => {
    const { tgId } = request.params as { tgId: string };
    const user = await User.findOne({ tgId: Number(tgId) });
    if (!user) return reply.status(404).send({ error: 'User not found' });
    return user;
  });

  fastify.get('/clients/:coachTgId', async (request, reply) => {
    const { coachTgId } = request.params as { coachTgId: string };
    const coach = await User.findOne({ tgId: Number(coachTgId), role: 'coach' });
    
    if (!coach) return reply.status(404).send({ error: 'Coach not found' });

    const clients = await User.find({ coachId: coach._id, role: 'client' });
    return { clients };
  });
}