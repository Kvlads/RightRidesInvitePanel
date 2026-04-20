import { Router, Request, Response } from 'express';
import { vkAuth } from '../middlewares/vkAuth.middleware';
import { adminRouter } from './admin.routes';

export const apiRouter = Router();

apiRouter.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

// Применяем middleware ко всем роутам ниже
apiRouter.use(vkAuth);

// Администрирование
apiRouter.use('/admin', adminRouter);

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