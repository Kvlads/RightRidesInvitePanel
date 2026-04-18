// src/index.ts
import { vk } from './bot';
import { prisma } from './models/user.model';

const startApp = async () => {
  try {
    // Подключаемся к БД
    await prisma.$connect();
    console.log('✅ Успешное подключение к базе данных Postgres');

    // Запускаем бота
    await vk.updates.start();
    console.log('✅ Бот успешно запущен (vk-io Long Poll) и ожидает сообщения...');
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске:', error);
    process.exit(1);
  }
};

startApp();