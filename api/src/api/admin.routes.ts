import { Router } from 'express';
import { prisma } from '../prisma/client';
import { adminAuth } from '../middlewares/adminAuth.middleware';

export const adminRouter = Router();
adminRouter.use(adminAuth);

// Получить данные одного мероприятия
adminRouter.get('/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: {
      id: Number(req.params.id),
      isDeleted: false,
    }
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Создать или обновить мероприятие
adminRouter.post('/events/save', async (req, res) => {
  const { id, ...data } = req.body;
  
  const eventData = {
    ...data,
    // Превращаем timestamp с фронтенда в объект Date для БД
    date: new Date(data.date),
    regEndDate: new Date(data.regEndDate),
  };

  if (id) {
    const updated = await prisma.event.update({
      where: { id: Number(id) },
      data: eventData
    });
    return res.json(updated);
  } else {
    const created = await prisma.event.create({
      data: eventData
    });
    return res.json(created);
  }
});

// Удалить мероприятие
adminRouter.delete('/events/:id', async (req, res) => {
  await prisma.event.update({
    where: { id: Number(req.params.id) },
    data: {
      isDeleted: true,
    }
  });
  res.json({ success: true });
});

// Экспорт участников (возвращаем список)
adminRouter.post('/events/:id/participants', async (req, res) => {
  const { type } = req.body;

  console.log('Export type', type)

  const participants = await prisma.participant.findMany({
    where: { 
      eventId: Number(req.params.id),
      type,
      status: type === 'participant' ? 'approved' : 'pending',
    },
    include: { user: true }
  });
  
  res.json(participants.map(p => ({
    // Используем опциональную цепочку (?.) на случай, если p.user === null
    name: p.fio || p.user?.name || 'Не указано',
    vkId: p.user?.vkId?.toString() || 'Нет VK ID',
    email: p.email || 'Не указан', // Добавили email в выгрузку
    city: p.city || 'Не указан',
    brand: p.brand || 'Не указана',
    plate: p.plate || 'Не указан',
    passengers: p.passengers || '0', 
    status: p.status,
    date: p.createdAt
  })));
});

// Получить список всех мероприятий (для панели управления)
adminRouter.get('/events', async (req, res) => {
  const events = await prisma.event.findMany({
    orderBy: {
      date: 'asc', // Сортируем по дате по возрастанию (ближайшие сначала)
    },
    // Выбираем только те поля, которые реально нужны для списка, чтобы не гонять лишний трафик
    select: {
      id: true,
      title: true,
      date: true,
      image: true,
    },
    where: {
      isDeleted: false,
    }
  });
  
  res.json(events);
});