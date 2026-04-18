// src/models/user.model.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env';

// Создаем адаптер, передавая строку подключения напрямую
const adapter = new PrismaPg({
  connectionString: config.dbUrl,
});

// Инициализируем клиента с адаптером
export const prisma = new PrismaClient({ adapter });

export const findOrCreateUser = async (vkId: number, firstName: string, lastName: string) => {
  return await prisma.user.upsert({
    where: { id: vkId },
    update: {},
    create: {
      id: vkId,
      firstName,
      lastName,
    },
  });
};

export const getUserById = async (vkId: number) => {
  return await prisma.user.findUnique({
    where: { id: vkId },
  });
};