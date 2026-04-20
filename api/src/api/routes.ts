import { Router, Request, Response } from 'express';
import { vkAuth } from '../middlewares/vkAuth.middleware';

export const apiRouter = Router();

apiRouter.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

// Применяем middleware ко всем роутам ниже
apiRouter.use(vkAuth);

apiRouter.post('/init', (req, res) => {
  // Если мы попали сюда, значит подпись верна, и req.user 100% существует
  res.json({ 
    message: 'Успешная авторизация', 
    user: req.user 
  });
});