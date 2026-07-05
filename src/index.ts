import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import cron from 'node-cron';

// Импорт бота и БД
import { bot } from './bot/bot';
import { connectDB } from './services/db';

// Импорт API роутов
import { userRoutes } from './api/user.routes';
import { trainingRoutes } from './api/training.routes';
import { templateRoutes } from './api/template.routes';

// Импорт сервисов автоматизации
import { generateSessionsFromTemplates } from './services/generator.service';
import { sendReminders } from './services/notifier.service';

// Инициализация переменных окружения
dotenv.config();

const fastify = Fastify({ 
  logger: true // Включаем логи для отслеживания запросов
});

const start = async () => {
  try {
    // 1. Подключаем Базу Данных
    await connectDB();

    // 2. Настраиваем API сервер (Fastify)
    await fastify.register(cors, { 
      origin: '*' // Разрешаем запросы со всех доменов (важно для Web App)
    });

    // Регистрация модулей API с префиксом /api
    await fastify.register(userRoutes, { prefix: '/api' });
    await fastify.register(trainingRoutes, { prefix: '/api' });
    await fastify.register(templateRoutes, { prefix: '/api' });

    // Базовый роут для проверки работоспособности
    fastify.get('/health', async () => {
      return { 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime() 
      };
    });

    // 3. Запускаем Telegram бота (Long Polling)
    // Запускаем без await, чтобы не блокировать выполнение дальше
    bot.start({
      onStart: (botInfo) => {
        console.log(`🤖 Бот @${botInfo.username} запущен и готов к работе`);
      },
    });

    // 4. Настройка автоматических задач (Cron)

    // Задача 1: Каждый день в 00:00 генерируем тренировки на 2 недели вперед
    cron.schedule('0 0 * * *', async () => {
      console.log('⏰ Выполнение ежедневной генерации сессий...');
      await generateSessionsFromTemplates();
    });

    // Задача 2: Каждые 15 минут проверяем, кому нужно отправить напоминание (за 2 часа до начала)
    cron.schedule('*/15 * * * *', async () => {
      await sendReminders();
    });

    // Сразу при запуске сервера генерируем сессии, чтобы база не была пустой
    await generateSessionsFromTemplates();

    // 5. Запускаем Веб-сервер
    const PORT = Number(process.env.PORT) || 3000;
    
    // host '0.0.0.0' обязателен для работы в Docker и на хостингах типа Render
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🚀 API сервер успешно запущен на порту ${PORT}`);
    console.log(`🔗 Доступен по адресу: http://localhost:${PORT}`);

  } catch (err) {
    console.error('💥 Критическая ошибка при запуске приложения:', err);
    process.exit(1);
  }
};

// Запуск всего приложения
start();