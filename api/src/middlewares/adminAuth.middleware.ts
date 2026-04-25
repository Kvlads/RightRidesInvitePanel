import { Request, Response } from "express";
import jwt from 'jsonwebtoken';

// Middleware для защиты админских роутов
export const adminAuth = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Нет доступа' });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_123');
    next();
  } catch (error) {
    console.log('[adminAuth] error', error);
    return res.status(403).json({ error: 'Токен истек или недействителен' });
  }
};