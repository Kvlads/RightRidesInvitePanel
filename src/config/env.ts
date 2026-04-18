// src/config/env.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  vkToken: process.env.VK_BOT_TOKEN || '',
  dbUrl: process.env.DATABASE_URL || '',
  // Превращаем строку с ID в массив чисел
  adminIds: process.env.VK_ADMIN_ID 
    ? process.env.VK_ADMIN_ID.split(',').map(id => Number(id.trim())) 
    : [],
};