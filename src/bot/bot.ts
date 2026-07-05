import { Bot } from 'grammy';
import { User } from '../models/User';
import { TrainingSession } from '../models/TrainingSession';
import { coachKeyboard, clientKeyboard } from './keyboards';
import { startOfDay, endOfDay } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

export const bot = new Bot(process.env.BOT_TOKEN!);

// Команда /start
bot.command('start', async (ctx) => {
  if (!ctx.from) return; // Захист від помилки undefined

  const tgId = ctx.from.id;
  const firstName = ctx.from.first_name;
  const username = ctx.from.username;
  const startParam = ctx.match; // Те, що після ?start=

  let user = await User.findOne({ tgId });

  if (!user) {
    if (startParam && startParam !== tgId.toString()) {
      // Реєстрація як клієнта
      const coach = await User.findOne({ tgId: Number(startParam), role: 'coach' });
      if (coach) {
        user = await User.create({
          tgId, role: 'client', coachId: coach._id,
          firstName, username
        });
        await ctx.reply(`👋 Вітаємо! Ви приєдналися до тренера ${coach.firstName}.`, { reply_markup: clientKeyboard });
        await bot.api.sendMessage(coach.tgId, `🔔 У вас новий клієнт: ${firstName}`);
      } else {
        await ctx.reply('⚠️ Тренера за цим посиланням не знайдено.');
      }
    } else {
      // Реєстрація як тренера
      user = await User.create({ tgId, role: 'coach', firstName, username });
      const inviteLink = `https://t.me/${ctx.me.username}?start=${tgId}`;
      await ctx.reply(`🏆 Ви зареєстровані як тренер!\n\nВаше посилання для клієнтів:\n<code>${inviteLink}</code>`, { 
        reply_markup: coachKeyboard,
        parse_mode: 'HTML' 
      });
    }
  } else {
    // Якщо користувач вже є
    const kb = user.role === 'coach' ? coachKeyboard : clientKeyboard;
    await ctx.reply('З поверненням! Чим можу допомогти?', { reply_markup: kb });
  }
});

// Кнопка: Розклад на сьогодні (для тренера)
bot.hears('🗓 Розклад на сьогодні', async (ctx) => {
  if (!ctx.from) return;

  const coach = await User.findOne({ tgId: ctx.from.id, role: 'coach' });
  if (!coach) return;

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const sessions = await TrainingSession.find({
    coachId: coach._id,
    startAt: { $gte: todayStart, $lte: todayEnd },
    status: { $ne: 'cancelled' }
  }).populate('clientId').sort({ startAt: 1 });

  if (sessions.length === 0) {
    return ctx.reply('Сьогодні тренувань немає ☕️');
  }

  let text = `📋 *Розклад на сьогодні:*\n\n`;
  for (const s of sessions) {
    const client = s.clientId as any;
    const time = s.startAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const statusIcon = s.status === 'confirmed' ? '✅' : '⏳';
    text += `${time} — ${client?.firstName || 'Клієнт'} ${statusIcon}\n`;
  }

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// Кнопка: Моє посилання
bot.hears('🔗 Моє посилання', async (ctx) => {
  if (!ctx.from) return;
  const inviteLink = `https://t.me/${ctx.me.username}?start=${ctx.from.id}`;
  await ctx.reply(`Ваше посилання для клієнтів:\n<code>${inviteLink}</code>`, { parse_mode: 'HTML' });
});

// Обробка натискання кнопки "✅ Буду"
bot.callbackQuery(/^confirm_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  if (!sessionId) return;

  await TrainingSession.findByIdAndUpdate(sessionId, { status: 'confirmed' });
  await ctx.answerCallbackQuery("Підтверджено!");
  await ctx.editMessageText(ctx.callbackQuery.message?.text + "\n\n✅ *Ви підтвердили свою участь*", { parse_mode: 'Markdown' });
});

// Обробка натискання кнопки "❌ Не зможу"
bot.callbackQuery(/^reject_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  if (!sessionId) return;

  const session = await TrainingSession.findByIdAndUpdate(sessionId, { status: 'cancelled' }).populate('coachId');
  await ctx.answerCallbackQuery("Скасовано");
  await ctx.editMessageText(ctx.callbackQuery.message?.text + "\n\n❌ *Ви відмовилися від тренування*", { parse_mode: 'Markdown' });

  const coach = session?.coachId as any;
  if (coach?.tgId) {
    await bot.api.sendMessage(coach.tgId, `⚠️ Клієнт відмінив тренування!`);
  }
});