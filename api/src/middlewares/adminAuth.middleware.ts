// src/api/middlewares/adminAuth.middleware.ts
import { Request, Response, NextFunction } from 'express';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем, авторизован ли пользователь вообще (на случай, если забыли добавить vkAuth)
  if (!req.user) {
    res.status(401).json({ error: 'Пользователь не авторизован' });
    return;
  }

  // Получаем список ID админов из .env (например: ADMIN_ID="123456,7891011")
  const adminIdsString = process.env.ADMIN_ID || '';
  
  // Разбиваем строку по запятой и убираем лишние пробелы
  const adminIds = adminIdsString.split(',').map(id => id.trim());

  // Проверяем, есть ли vkId текущего пользователя в списке
  const isUserAdmin = adminIds.includes(req.user.vkId.toString());

  if (!isUserAdmin) {
    // 403 Forbidden — сервер понял запрос, но отказывается его выполнять из-за прав
    res.status(403).json({ error: 'Доступ запрещен. Требуются права администратора.' });
    return;
  }

  // Если всё ок, пропускаем к админским эндпоинтам
  next();
};