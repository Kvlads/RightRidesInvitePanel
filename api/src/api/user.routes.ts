import { Router } from 'express';
import { prisma } from '../prisma/client';
import { vk, sendApprovalRequestToAdmins } from '../bot';

export const userRouter = Router();

// 1. Получение списка активных мероприятий
userRouter.get('/events', async (req, res) => {
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const events = await prisma.event.findMany({
    where: { 
      isActive: true,
      isDeleted: false,
      date: { gte: twoDaysAgo }
    },
    orderBy: { date: 'asc' }
  });
  res.json(events);
});

// 2. Детали мероприятия
userRouter.get('/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { 
      id: Number(req.params.id),
      isDeleted: false,
    }
  });
  res.json(event);
});

// 3. Регистрация на мероприятие (создание новой заявки)
userRouter.post('/events/:id/register', async (req, res) => {
  const eventId = Number(req.params.id);
  
  // Извлекаем токен капчи из тела запроса
  const { captchaToken, photos, photoUrls, ...data } = req.body;

  // ПРОВЕРКА КАПЧИ
  if (!captchaToken) {
    return res.status(403).json({ error: 'Пожалуйста, пройдите проверку на робота.' });
  }

  try {
    const yandexUrl = `https://smartcaptcha.yandexcloud.net/validate?secret=${process.env.YANDEX_CAPTCHA_SECRET}&token=${captchaToken}&ip=${req.ip}`;
    
    const captchaReq = await fetch(yandexUrl);
    const captchaRes = await captchaReq.json();

    if (captchaRes.status !== 'ok') {
      return res.status(403).json({ error: 'Проверка на робота не пройдена. Попробуйте обновить страницу.' });
    }
  } catch (err) {
    console.error('Ошибка проверки Yandex Captcha:', err);
    return res.status(500).json({ error: 'Ошибка сервиса проверки спама. Пожалуйста, попробуйте позже.' });
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) return res.status(404).json({ error: 'Мероприятие не найдено' });
  if (new Date() > new Date(event.regEndDate) || !event.registerOpen) {
    return res.status(403).json({ error: 'Регистрация закрыта.' });
  }

  const incomingPhotos = Array.isArray(photos) ? photos : Array.isArray(photoUrls) ? photoUrls : [];
  const photosToCreate = incomingPhotos.map((url: string) => ({ url }));

  const registration = await prisma.participant.create({
    data: {
      eventId,
      userId: 1, // Оставляем системного пользователя
      ...data,
      status: event.requireApproval ? 'pending' : 'approved', 
      photos: { create: photosToCreate }
    }
  });

  if (data.type === 'participant' && event.requireApproval) {
    sendApprovalRequestToAdmins(registration.id).catch(console.error);
  }

  res.json({ success: true, registration });
});

// 4. Получение заявок текущего пользователя
userRouter.get('/events/:id/my-requests', async (req, res) => {
  // Этот роут больше не работает для анонимных пользователей, 
  // так как нет req.user (авторизация VK отключена)
  res.status(401).json({ error: 'Авторизация отключена' });
});

// 5. Детали конкретной заявки
userRouter.get('/requests/:id', async (req, res) => {
  // Этот роут больше не работает для анонимных пользователей
  res.status(401).json({ error: 'Авторизация отключена' });
});