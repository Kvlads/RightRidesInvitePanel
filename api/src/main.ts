(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(process.cwd(), '../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} 

import express from 'express';
import { createServer } from 'http'; // Импортируем HTTP
import { Server } from 'socket.io';  // Импортируем Socket.io
import { prisma } from './prisma/client';
import { apiRouter } from './api/routes';
import { startBot } from './bot';

const app = express();
const httpServer = createServer(app); // Оборачиваем express в http-сервер

// Инициализируем WebSockets и экспортируем io для использования в роутах
export const io = new Server(httpServer, {
  cors: { origin: '*' } // Настройте CORS строже для продакшена
});

io.on('connection', (socket) => {
  console.log('🔗 WebSocket клиент подключен:', socket.id);
  
  // Клиент может подписаться на обновления конкретного мероприятия
  socket.on('join_event', (eventId) => {
    socket.join(`event_${eventId}`);
    console.log(`Клиент ${socket.id} подписался на event_${eventId}`);
  });
});

app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use('/api/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api', apiRouter);

const bootstrap = async () => {
  try {
    await prisma.$connect();
    console.log('✅ База данных подключена');

    await startBot();

    const PORT = process.env.PORT || 3000;
    // ВАЖНО: Запускаем httpServer, а не app
    httpServer.listen(PORT, () => {
      console.log(`🚀 API сервер и WebSockets запущены на порту ${PORT}`);
    });

  } catch (error) {
    console.error('Критическая ошибка при запуске:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

bootstrap();