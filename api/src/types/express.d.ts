// src/types/express.d.ts
import { User } from '@prisma/client';

declare global {
  namespace Express {
    export interface Request {
      // Добавляем нашего пользователя в объект запроса
      user?: User; 
    }
  }
}