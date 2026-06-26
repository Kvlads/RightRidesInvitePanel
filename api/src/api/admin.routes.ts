import { Router } from 'express';
import { prisma } from '../prisma/client';
import { adminAuth } from '../middlewares/adminAuth.middleware';
import { io } from '../main';
import crypto from 'crypto';
import { sendDecisionEmail } from '../bot';

export const adminRouter = Router();
adminRouter.use(adminAuth);

// Получить данные одного мероприятия
adminRouter.get('/events/:id', async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: Number(req.params.id), isDeleted: false }
  });
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Создать или обновить мероприятие
adminRouter.post('/events/save', async (req: any, res) => {
  if (req.user?.role === 'voter') {
    return res.status(403).json({ error: 'Выборщики не могут редактировать мероприятия' });
  }

  const { id, ...data } = req.body;
  const eventData = {
    ...data,
    date: new Date(data.date),
    regEndDate: new Date(data.regEndDate),
  };

  if (id) {
    const updated = await prisma.event.update({ where: { id: Number(id) }, data: eventData });
    return res.json(updated);
  } else {
    const created = await prisma.event.create({ data: eventData });
    return res.json(created);
  }
});

// Удалить мероприятие
adminRouter.delete('/events/:id', async (req: any, res) => {
  if (req.user?.role === 'voter') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }

  await prisma.event.update({
    where: { id: Number(req.params.id) },
    data: { isDeleted: true }
  });
  res.json({ success: true });
});

// Экспорт участников (возвращаем список)
adminRouter.post('/events/:id/participants', async (req, res) => {
  const { type } = req.body;
  const participants = await prisma.participant.findMany({
    where: { 
      eventId: Number(req.params.id),
      type,
      status: type === 'participant' ? 'approved' : 'pending',
    },
    include: { user: true }
  });
  
  res.json(participants.map(p => ({
    name: p.fio || p.user?.name || 'Не указано',
    phone: p.phone,
    vkId: p.user?.vkId?.toString() || 'Нет VK ID',
    email: p.email || 'Не указан',
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

// Эндпоинт для голосования через админку (с защитой от повторного голосования в закрытых заявках)
adminRouter.post('/requests/:id/vote', async (req: any, res) => {
  const { decision } = req.body; // 'yes' или 'no'
  const participantId = Number(req.params.id);
  const user = req.user; 
  
  if (!user) return res.status(401).json({ error: 'Не удалось определить пользователя' });

  try {
    // ВАЖНО: Проверяем текущий статус заявки ДО того, как засчитать голос
    const currentParticipant = await prisma.participant.findUnique({
      where: { id: participantId }
    });

    if (!currentParticipant) {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }

    // Если заявка уже одобрена или отклонена — блокируем изменение голосов
    if (currentParticipant.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Голосование по этой заявке уже завершено, изменить выбор невозможно' 
      });
    }

    const voterId = user.vkId ? BigInt(user.vkId) : BigInt(-(user.id || 1));
    const voterName = user.login || (user.id === -1 ? 'Главный Администратор' : 'Выборщик');

    // Сохраняем/обновляем голос
    await prisma.vote.upsert({
      where: { participantId_vkId: { participantId, vkId: voterId } },
      update: { decision, name: voterName }, 
      create: { participantId, vkId: voterId, name: voterName, decision }
    });

    // Считаем текущие голоса
    const allVotes = await prisma.vote.findMany({ where: { participantId } });
    const yesVotes = allVotes.filter(v => v.decision === 'yes').length;
    const noVotes = allVotes.filter(v => v.decision === 'no').length;

    const totalUsersInDb = (await prisma.adminUser.count())+1;
    const totalEligibleVoters = totalUsersInDb > 0 ? totalUsersInDb : 1;
    
    const threshold = totalEligibleVoters * 0.7; 
    let newStatus = 'pending';

    if (noVotes > threshold) {
      newStatus = 'rejected';
    } else if (yesVotes > threshold) {
      newStatus = 'approved';
    }

    if (newStatus !== 'pending') {
      await prisma.participant.update({
        where: { id: participantId },
        data: { status: newStatus }
      });

      sendDecisionEmail(participantId).catch(console.error);
    }

    // Получаем финальное состояние для отправки по сокетам
    const updatedParticipant = await prisma.participant.findUnique({ 
      where: { id: participantId },
      include: { votes: true, photos: true } 
    });

    // Уведомляем клиентов по WebSockets
    io.to(`event_${updatedParticipant?.eventId}`).emit('vote_updated', {
      participantId,
      newStatus: updatedParticipant?.status,
      updatedParticipant 
    });

    res.json({ success: true, newStatus });
  } catch (error) {
    console.error('Ошибка при сохранении голоса:', error);
    res.status(500).json({ error: 'Ошибка сервера при голосовании' });
  }
});

adminRouter.get('/events/:id/requests', async (req, res) => {
  const requests = await prisma.participant.findMany({
    where: { 
      eventId: Number(req.params.id),
      type: 'participant' // Голосуем только за участников
    },
    include: { 
      photos: true, 
      votes: true // Подтягиваем текущие голоса
    },
    orderBy: { createdAt: 'desc' }
  });
  
  res.json(requests);
});

// Получить список всех администраторов и выборщиков
adminRouter.get('/staff', async (req: any, res) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Доступ запрещен' });
  }
  
  const staff = await prisma.adminUser.findMany({
    select: { id: true, login: true, role: true, vkId: true },
    orderBy: { id: 'asc' }
  });
  
  // Меняем BigInt на String перед отправкой (если вдруг ломается JSON)
  const safeStaff = staff.map(user => ({
    ...user,
    vkId: user.vkId ? user.vkId.toString() : null
  }));
  
  res.json(safeStaff);
});

// Создать нового сотрудника
adminRouter.post('/staff', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещен' });
  
  const { login, password, role, vkId } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Логин и пароль обязательны' });

  // Проверка уникальности
  const existing = await prisma.adminUser.findUnique({ where: { login } });
  if (existing) return res.status(400).json({ error: 'Пользователь с таким логином уже существует' });

  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');

  const newUser = await prisma.adminUser.create({
    data: {
      login,
      password: hashedPassword,
      role: role || 'voter',
      vkId: vkId ? BigInt(vkId) : null
    },
    select: { id: true, login: true, role: true, vkId: true }
  });

  res.json(newUser);
});

// Обновить сотрудника (роль, vkId или пароль)
adminRouter.put('/staff/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещен' });
  
  const { login, password, role, vkId } = req.body;
  const updateData: any = { login, role, vkId: vkId ? BigInt(vkId) : null };

  // Если передали новый пароль — обновляем и его
  if (password && password.trim() !== '') {
    updateData.password = crypto.createHash('md5').update(password).digest('hex');
  }

  try {
    const updatedUser = await prisma.adminUser.update({
      where: { id: Number(req.params.id) },
      data: updateData,
      select: { id: true, login: true, role: true, vkId: true }
    });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: 'Ошибка обновления' });
  }
});

// Удалить сотрудника
adminRouter.delete('/staff/:id', async (req: any, res) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Доступ запрещен' });
  
  await prisma.adminUser.delete({
    where: { id: Number(req.params.id) }
  });
  
  res.json({ success: true });
});
// --- КОНЕЦ УПРАВЛЕНИЯ ПЕРСОНАЛОМ ---