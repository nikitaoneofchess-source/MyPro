import { TrainingSession } from '../models/TrainingSession';
import { bot } from '../bot/bot';
import { createConfirmationKeyboard } from '../bot/keyboards';
import { format } from 'date-fns';

export const sendReminders = async () => {
  console.log('🔔 Перевірка тренувань для відправки повідомлень...');
  
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const twoHoursAnd15MinLater = new Date(now.getTime() + (2 * 60 + 15) * 60 * 1000);

  const upcomingSessions = await TrainingSession.find({
    startAt: { $gte: twoHoursLater, $lte: twoHoursAnd15MinLater },
    status: 'planned'
  }).populate('clientId coachId');

  for (const session of upcomingSessions) {
    const client = session.clientId as any;
    const coach = session.coachId as any;

    if (!client?.tgId) continue;

    try {
      const time = format(session.startAt, 'HH:mm');
      const message = `🔔 *Нагадування про тренування!*\n\n⏱ Час: ${time}\n👨‍🏫 Тренер: ${coach?.firstName || 'Ваш тренер'}\n\nВи будете сьогодні?`;

      await bot.api.sendMessage(client.tgId, message, { 
        reply_markup: createConfirmationKeyboard(session._id.toString()),
        parse_mode: 'Markdown' 
      });
      
      console.log(`📩 Повідомлення надіслано клієнту ${client.tgId}`);
    } catch (e) {
      console.error(`❌ Помилка відправки клієнту ${client.tgId}`, e);
    }
  }
};