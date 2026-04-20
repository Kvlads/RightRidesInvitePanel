import { Router, Request, Response } from 'express';
import { vkAuth } from '../middlewares/vkAuth.middleware';
import { adminRouter } from './admin.routes';
import { userRouter } from './user.routes';
import { upload } from '../middlewares/upload.middleware';

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

apiRouter.post('/upload', vkAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'Файл не загружен' });
    return;
  }

  // Формируем URL, по которому файл будет доступен извне
  // Например: https://ваш-домен.ru/uploads/12345.jpg
  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({ url: fileUrl });
});
