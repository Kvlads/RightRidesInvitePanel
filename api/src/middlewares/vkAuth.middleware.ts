// src/api/middlewares/vkAuth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma/client';

/**
 * Функция верификации подписи ВКонтакте
 */
function verifyVkSign(authHeader: string, secretKey: string): boolean {
  // Убираем слово Bearer, если фронтенд его прислал
  const queryString = authHeader.replace(/^Bearer\s+/i, '');
  
  const params = new URLSearchParams(queryString);
  const queryParams: Record<string, string> = {};
  let sign = '';

  // Собираем все параметры, начинающиеся с vk_
  for (const [key, value] of params.entries()) {
    if (key === 'sign') {
      sign = value;
    } else if (key.startsWith('vk_')) {
      queryParams[key] = value;
    }
  }

  if (!sign || Object.keys(queryParams).length === 0) {
    return false;
  }

  // Сортируем ключи по алфавиту и формируем строку
  const signString = Object.keys(queryParams)
    .sort()
    .map((key) => `${key}=${queryParams[key]}`)
    .join('&');

  // Создаем HMAC SHA256 хеш
  const hash = crypto
    .createHmac('sha256', secretKey)
    .update(signString)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=$/, '');

  return hash === sign;
}

/**
 * Express Middleware для авторизации
 */
export const vkAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const secretKey = process.env.VK_APP_SECRET;

  if (!secretKey) {
    throw new Error('Критическая ошибка: VK_APP_SECRET не задан в .env');
  }

  if (!authHeader) {
    res.status(401).json({ error: 'Authorization header is missing' });
    return;
  }

  // 1. Проверяем криптографическую подпись
  const isValid = verifyVkSign(authHeader, secretKey);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid VK signature' });
    return;
  }

  // 2. Достаем vk_user_id из валидной строки
  const queryString = authHeader.replace(/^Bearer\s+/i, '');
  const params = new URLSearchParams(queryString);
  const vkUserIdString = params.get('vk_user_id');

  if (!vkUserIdString) {
    res.status(401).json({ error: 'vk_user_id not found in params' });
    return;
  }

  const vkId = BigInt(vkUserIdString);

  // 3. Ищем пользователя в базе
  let user = await prisma.user.findFirst({
    where: { vkId }
  });

  // 4. Если пользователя нет — создаем его
  if (!user) {
    // Ожидаем, что фронтенд при первом запросе передал name в body
    // Если не передал — ставим заглушку, чтобы не ронять БД
    const name = req.body?.name || `User #${vkUserIdString}`;

    user = await prisma.user.create({
      data: {
        vkId,
        name,
        // isBotMessagingAllow по умолчанию будет false согласно вашей схеме
      }
    });
  }

  // 5. Сохраняем пользователя в объект запроса для следующих контроллеров
  req.user = user;
  
  // Передаем управление дальше
  next();
};