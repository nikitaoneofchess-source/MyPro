import { Bot } from 'grammy';
import { User } from '../models/User.js';
import { TrainingSession } from '../models/TrainingSession.js';
import { coachKeyboard, clientKeyboard } from './keyboards.js';
import { startOfDay, endOfDay } from 'date-fns';
import dotenv from 'dotenv';

dotenv.config();

export const bot = new Bot(process.env.BOT_TOKEN!);

// --- КОМАНДА /START ---
bot.command('start', async (ctx) => {
  if (!ctx.from) return;
  const tgId = ctx.from.id;
  const startParam = ctx.match;

  let user = await User.findOne({ tgId });

  if (!user) {
    if (startParam && startParam !== tgId.toString()) {
      // Реєстрація клієнта
      const coach = await User.findOne({ tgId: Number(startParam), role: 'coach' });
      if (coach) {
        user = await User.create({
          tgId, role: 'client', coachId: coach._id,
          firstName: ctx.from.first_name, username: ctx.from.username
        });
        await ctx.reply(`👋 Вітаємо! Ви приєдналися до тренера ${coach.firstName}.`, { reply_markup: clientKeyboard });
        await bot.api.sendMessage(coach.tgId, `🔔 Новий клієнт: ${ctx.from.first_name} (@${ctx.from.username || 'hidden'})`);
      }
    } else {
      // Реєстрація тренера
      user = await User.create({
        tgId, role: 'coach', firstName: ctx.from.first_name, username: ctx.from.username
      });
      const inviteLink = `https://t.me/${ctx.me.username}?start=${tgId}`;
      await ctx.reply(`🏆 Ви зареєстровані як тренер!\n\nВаше посилання для клієнтів:\n<code>${inviteLink}</code>`, { 
        reply_markup: coachKeyboard,
        parse_mode: 'HTML' 
      });
    }
  } else {
    const kb = user.role === 'coach' ? coachKeyboard : clientKeyboard;
    await ctx.reply('З поверненням! Оберіть дію в меню нижче:', { reply_markup: kb });
  }
});

// --- ЛОГІКА ТРЕНЕРА ---

// 1. Кнопка "👥 Мої клієнти"
bot.hears('👥 Мої клієнти', async (ctx) => {
  if (!ctx.from) return;
  const coach = await User.findOne({ tgId: ctx.from.id, role: 'coach' });
  if (!coach) return;

  const clients = await User.find({ coachId: coach._id, role: 'client' });
  
  if (clients.length === 0) {
    return ctx.reply('У вас поки немає підв\'язаних клієнтів. Надішліть їм ваше посилання.');
  }

  let text = `👥 *Ваші клієнти:*\n\n`;
  clients.forEach((c, index) => {
    text += `${index + 1}. ${c.firstName} (@${c.username || 'hidden'})\n`;
  });
  
  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// 2. Кнопка "🗓 Розклад на сьогодні"
bot.hears('🗓 Розклад на сьогодні', async (ctx) => {
  if (!ctx.from) return;
  const coach = await User.findOne({ tgId: ctx.from.id, role: 'coach' });
  if (!coach) return;

  const start = startOfDay(new Date());
  const end = endOfDay(new Date());

  const sessions = await TrainingSession.find({
    coachId: coach._id,
    startAt: { $gte: start, $lte: end }
  }).populate('clientId').sort({ startAt: 1 });

  if (sessions.length === 0) {
    return ctx.reply('Сьогодні тренувань немає ☕️');
  }

  let text = `📋 *Розклад на сьогодні:*\n\n`;
  sessions.forEach(s => {
    const client = s.clientId as any;
    const time = s.startAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    const status = s.status === 'confirmed' ? '✅' : '⏳';
    text += `${time} — ${client?.firstName} ${status}\n`;
  });

  await ctx.reply(text, { parse_mode: 'Markdown' });
});

// 3. Кнопка "🔗 Моє посилання"
bot.hears('🔗 Моє посилання', async (ctx) => {
  if (!ctx.from) return;
  const inviteLink = `https://t.me/${ctx.me.username}?start=${ctx.from.id}`;
  await ctx.reply(`Твоє посилання для залучення клієнтів:\n\n<code>${inviteLink}</code>`, { parse_mode: 'HTML' });
});

// --- ЛОГІКА КЛІЄНТА ---

// 1. Кнопка "📅 Наступне тренування"
bot.hears('📅 Наступне тренування', async (ctx) => {
  if (!ctx.from) return;
  const client = await User.findOne({ tgId: ctx.from.id, role: 'client' });
  if (!client) return;

  const nextSession = await TrainingSession.findOne({
    clientId: client._id,
    startAt: { $gte: new Date() }
  }).sort({ startAt: 1 }).populate('coachId');

  if (!nextSession) {
    return ctx.reply('У вас немає запланованих тренувань. Зверніться до тренера.');
  }

  const coach = nextSession.coachId as any;
  const dateStr = nextSession.startAt.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  const timeStr = nextSession.startAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });

  await ctx.reply(
    `🗓 *Ваше наступне заняття:*\n\n` +
    `📅 Дата: ${dateStr}\n` +
    `⏰ Час: ${timeStr}\n` +
    `👨‍🏫 Тренер: ${coach?.firstName}\n\n` +
    `Статус: ${nextSession.status === 'confirmed' ? '✅ Підтверджено' : '⏳ Очікує'}`,
    { parse_mode: 'Markdown' }
  );
});

// 2. Кнопка "👨‍🏫 Мій тренер"
bot.hears('👨‍🏫 Мій тренер', async (ctx) => {
  if (!ctx.from) return;
  const client = await User.findOne({ tgId: ctx.from.id, role: 'client' }).populate('coachId');
  
  if (!client || !client.coachId) {
    return ctx.reply('Ви ще не прикріплені до жодного тренера.');
  }

  const coach = client.coachId as any;
  await ctx.reply(
    `👨‍🏫 *Ваш тренер:*\n\n` +
    `Ім'я: ${coach.firstName}\n` +
    `Контакт: @${coach.username || 'не вказано'}`,
    { parse_mode: 'Markdown' }
  );
});

// 3. Кнопка "❓ Допомога"
bot.hears('Допомога', async (ctx) => {
  await ctx.reply(
    `🤖 *Як користуватися MyPro?*\n\n` +
    `• Якщо ви *тренер*: створюйте графіки у Веб-додатку, надсилайте посилання клієнтам.\n` +
    `• Якщо ви *клієнт*: ви отримуватимете сповіщення за 2 години до тренування з кнопками підтвердження.\n\n` +
    // `З усіх питань: @support_account`, // Заміни на свій юзернейм
    { parse_mode: 'HTML' } // Змінили на HTML
  );
});

// --- CALLBACK QUERIES (Кнопки під повідомленням) ---

bot.callbackQuery(/^confirm_(.+)$/, async (ctx) => {
  const sessionId = ctx.match[1];
  if (!sessionId) return;
  await TrainingSession.findByIdAndUpdate(sessionId, { status: 'confirmed' });
  await ctx.answerCallbackQuery("Підтверджено!");
  await ctx.editMessageText(ctx.callbackQuery.message?.text + "\n\n✅ *Ви підтвердили свою участь*", { parse_mode: 'Markdown' });
});

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