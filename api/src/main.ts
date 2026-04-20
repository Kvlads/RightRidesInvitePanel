(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Проверяем наличие файла для локальной разработки (Dev-режим)
const envPath = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(envPath)) {
  // Мы запускаем код локально, загружаем из файла
  dotenv.config({ path: envPath });
} 
// Если файла нет (Prod-режим в Docker), мы ничего не делаем.
// Docker Compose УЖЕ положил все нужные ключи в process.env!

import express from 'express';
import { prisma } from './prisma/client';
import { apiRouter } from './api/routes';
import { startBot } from './bot';

const app = express();
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Подключение маршрутов API
app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api', apiRouter);

const bootstrap = async () => {
  try {
    // 1. Инициализация соединения с БД
    await prisma.$connect();
    console.log('База данных подключена');

    // 2. Запуск бота
    await startBot();

    // 3. Запуск HTTP-сервера
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`API сервер запущен на порту ${PORT}`);
    });

  } catch (error) {
    console.error('Критическая ошибка при запуске:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

bootstrap();