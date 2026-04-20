// src/api/admin.routes.ts
import { Router } from 'express';
import { adminAuth } from '../middlewares/adminAuth.middleware';

export const adminRouter = Router();

// Вешаем охранника на ВСЕ роуты внутри этого файла
adminRouter.use(adminAuth);

// Теперь этот роут доступен только админам (по пути /api/admin/stats)
adminRouter.get('/stats', (req, res) => {
  res.json({
    message: 'Добро пожаловать в панель управления',
    adminName: req.user?.name
  });
});