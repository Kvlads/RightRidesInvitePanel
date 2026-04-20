import { Router, Request, Response } from 'express';
import { vkAuth } from '../middlewares/vkAuth.middleware';
import { adminRouter } from './admin.routes';
import { userRouter } from './user.routes';
import { upload } from '../middlewares/upload.middleware';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';

export const apiRouter = Router();

apiRouter.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

// Применяем middleware ко всем роутам ниже
apiRouter.use(vkAuth);

apiRouter.post('/init', (req, res) => {
  const adminIdsString = process.env.ADMIN_ID || '';
  const adminIds = adminIdsString.split(',').map(id => id.trim());
  const currentVkId = req.user!.vkId.toString();
  
  const isAdmin = adminIds.includes(currentVkId);

  res.json({ 
    message: 'Успешная авторизация', 
    user: req.user,
    isAdmin 
  });
});

// Администрирование
apiRouter.use('/admin', adminRouter);

// Пользовательская часть
apiRouter.use('/user', userRouter);

apiRouter.post('/upload', vkAuth, upload.single('file'), async (req, res) => {
  // Создаем папку для загрузок, если её нет
  const uploadDir = 'uploads';
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Файл не загружен или неверный формат' });
  }

  try {
    // Генерируем имя файла. Сохранять будем в .webp для максимального сжатия
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    const filepath = path.join(uploadDir, filename);

    // Магия Sharp: берем файл из памяти, меняем размер, сжимаем и сохраняем
    await sharp(req.file.buffer)
      .resize({
        width: 1080,
        height: 1080,
        fit: 'inside', // Сохраняет пропорции, фото впишется в квадрат 1080x1080
        withoutEnlargement: true // Если картинка меньше 1080, она не будет растягиваться
      })
      .webp({ quality: 80 }) // 80% качество WebP дает отличное изображение при смешном весе
      .toFile(filepath);

    // Возвращаем публичный URL для фронтенда
    res.json({ url: `/uploads/${filename}` });
    
  } catch (error) {
    console.error('Ошибка обработки изображения:', error);
    res.status(500).json({ error: 'Произошла ошибка при сохранении фото' });
  }
});