import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Імпорт бота та БД
import { bot } from './bot/bot';
import { connectDB } from './services/db';

// Імпорт API роутів
import { userRoutes } from './api/user.routes';
import { trainingRoutes } from './api/training.routes';
import { templateRoutes } from './api/template.routes';

// Імпорт сервісів автоматизації
import { generateSessionsFromTemplates } from './services/generator.service';
import { sendReminders } from './services/notifier.service';

dotenv.config();

const fastify = Fastify({ 
  logger: true 
});

const start = async () => {
  try {
    // 1. Підключаємо Базу Даних
    await connectDB();

    // 2. Налаштовуємо CORS
    await fastify.register(cors, { 
      origin: '*' 
    });

    // --- СЕРВІСНІ ЕНДПОЇНТИ (Для UptimeRobot та Render) ---
    
    // Спеціальний легкий маршрут для пінгів
    fastify.get('/ping', async () => {
      return { status: 'alive', uptime: process.uptime() };
    });

    // Твій існуючий health check
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString()
      };
    });

    // 3. Реєстрація модулів API
    await fastify.register(userRoutes, { prefix: '/api' });
    await fastify.register(trainingRoutes, { prefix: '/api' });
    await fastify.register(templateRoutes, { prefix: '/api' });

    // 4. Запуск Telegram бота (Long Polling)
    bot.start({
      onStart: (botInfo) => {
        console.log(`🤖 Бот @${botInfo.username} запущен`);
      },
    }).catch(err => console.error("Помилка бота:", err));

    // 5. Настройка автоматичних задач (Cron)
    cron.schedule('0 0 * * *', async () => {
      console.log('⏰ Щоденна генерація...');
      await generateSessionsFromTemplates();
    });

    cron.schedule('*/15 * * * *', async () => {
      await sendReminders();
    });

    // Запуск генерації при старті
    await generateSessionsFromTemplates();

    // 6. Запуск Веб-сервера
    const PORT = Number(process.env.PORT) || 3000;
    
    // ВАЖЛИВО: host '0.0.0.0' для Render
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🚀 Сервер працює на порту ${PORT}`);

  } catch (err) {
    console.error('💥 Помилка:', err);
    process.exit(1);
  }
};

start();