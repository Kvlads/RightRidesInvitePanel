// api/src/api/routes.ts
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { adminRouter } from './admin.routes';
import { userRouter } from './user.routes';
import { upload } from '../middlewares/upload.middleware';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { prisma } from '../prisma/client';

export const apiRouter = Router();

apiRouter.get('/', (req: Request, res: Response) => {
  res.send('API works');
});

apiRouter.post('/init', (req, res) => {
  res.json({ 
    message: 'Успешная инициализация', 
    isAdmin: !!req.headers.authorization?.includes('Bearer') // Простейшая проверка на наличие токена
  });
});

// Эндпоинт для входа администратора
apiRouter.post('/auth/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });

  const hashedPassword = crypto.createHash('md5').update(password).digest('hex');
  const secret = process.env.JWT_SECRET || 'fallback_secret_key_123';

  // 1. Ищем пользователя в базе
  const dbUser = await prisma.adminUser.findUnique({ where: { login } });
  
  if (dbUser && dbUser.password === hashedPassword) {
    const token = jwt.sign(
      { 
        id: dbUser.id, 
        role: dbUser.role, // 'admin' или 'voter'
        vkId: dbUser.vkId?.toString() 
      }, 
      secret, { expiresIn: '24h' }
    );
    return res.json({ success: true, token, role: dbUser.role });
  }

  // 2. Fallback: вход главного админа через .env (если база еще пустая)
  if (login === process.env.APP_LOGIN && hashedPassword === process.env.APP_PASSWORD) {
    const token = jwt.sign(
      { 
        id: -1, // Системный внутренний ID для .env админа
        role: 'admin',
        vkId: process.env.APP_VK_ID || null // Берем из .env, если есть
      }, 
      secret, { expiresIn: '24h' }
    );
    return res.json({ success: true, token, role: 'admin' });
  }

  return res.status(401).json({ error: 'Неверный логин или пароль' });
});

// Администрирование (теперь защищено нашим middleware!)
apiRouter.use('/admin', adminRouter);

// Пользовательская часть (остается открытой или со своей логикой)
apiRouter.use('/user', userRouter);

apiRouter.post('/upload', upload.single('file'), async (req, res) => {
  // ... ваш существующий код загрузки файлов ...
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен или неверный формат' });
  }

  try {
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1080, height: 1080, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    res.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Ошибка обработки изображения:', error);
    res.status(500).json({ error: 'Произошла ошибка при сохранении фото' });
  }
});