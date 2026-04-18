// src/controllers/user.controller.ts
import { MessageContext } from 'vk-io';
import { mainMenuKeyboard } from '../views/keyboards';

export const handleStart = async (ctx: MessageContext) => {
  if (ctx.isOutbox) return;

  // Берем пользователя напрямую из контекста
  const user = ctx.state.user;

  if (!user) {
    await ctx.send('Произошла ошибка при загрузке профиля.');
    return;
  }

  await ctx.send({
    message: `Привет, ${user.firstName}! Ты успешно зарегистрирован в системе.`,
    keyboard: mainMenuKeyboard,
  });
};

export const handleEventsList = async (ctx: MessageContext) => {
  if (ctx.isOutbox) return;

  const user = ctx.state.user;

  if (user) {
    console.log('---[ ЗАПРОС СПИСКА МЕРОПРИЯТИЙ ]---');
    console.log(`Пользователь: ${user.firstName} ${user.lastName} (VK ID: ${user.id})`);
    console.log(`Дата регистрации: ${user.createdAt}`);
    console.log('-----------------------------------');
  }

  await ctx.send('Данные успешно выведены в консоль сервера!');
};