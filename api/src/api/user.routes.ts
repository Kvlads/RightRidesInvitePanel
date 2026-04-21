import { Router } from 'express';
import { prisma } from '../prisma/client';

export const userRouter = Router();

// 1. Получение списка активных мероприятий
userRouter.get('/events', async (req, res) => {
  // Вычисляем дату, которая была ровно 2 дня назад от текущего момента
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const events = await prisma.event.findMany({
    where: { 
      isActive: true,
      isDeleted: false,
      // Мероприятие будет отображаться, если его дата больше или равна (gte) "позавчера"
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
  const userId = req.user!.id;
  
  // ЗАЩИТА: Проверяем, не истекла ли дата регистрации
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });

  if (!event) {
    return res.status(404).json({ error: 'Мероприятие не найдено' });
  }

  // Если текущее время больше, чем время закрытия регистрации
  if (new Date() > new Date(event.regEndDate)) {
    return res.status(403).json({ error: 'Регистрация на данное мероприятие уже закрыта.' });
  }
  
  const { photos, photoUrls, ...data } = req.body;
  const incomingPhotos = Array.isArray(photos) ? photos : Array.isArray(photoUrls) ? photoUrls : [];

  const photosToCreate = incomingPhotos.map((url: string) => ({ url }));

  const registration = await prisma.participant.create({
    data: {
      eventId,
      userId,
      ...data,
      status: 'pending',
      photos: {
        create: photosToCreate
      }
    }
  });

  res.json({ success: true, registration });
});

// 4. Получение заявок текущего пользователя по ID ивента
userRouter.get('/events/:id/my-requests', async (req, res) => {
  const requests = await prisma.participant.findMany({
    where: { 
      eventId: Number(req.params.id),
      userId: req.user!.id 
    }
  });
  res.json(requests);
});

// 5. Детали конкретной заявки
userRouter.get('/requests/:id', async (req, res) => {
  const request = await prisma.participant.findFirst({
    where: { 
      id: Number(req.params.id),
      userId: req.user!.id
    },
    include: { photos: true }
  });
  res.json(request);
});