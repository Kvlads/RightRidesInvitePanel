// src/controllers/admin.controller.ts
import { ContextDefaultState, Keyboard, MessageContext } from 'vk-io';
import { config } from '../config/env';
import { adminMenuKeyboard } from '../views/keyboards';
import { vk } from '../bot';
import { prisma } from '../models/user.model';

export const handleAdminAuth = async (ctx: MessageContext) => {
  const isAllowed = config.adminIds.includes(ctx.senderId);

  if (!isAllowed) {
    return;
  }

  await ctx.send({
    message: 'Режим администратора активирован',
    keyboard: adminMenuKeyboard,
  });
};

export const handleAdminButtons = async (ctx: MessageContext) => {
  // Выводим название нажатой кнопки в консоль
  console.log(`Нажата кнопка админа: ${ctx.text}`);
  
  await ctx.send(`Вы выбрали: ${ctx.text}`);
};

export const adminSceneCommandIntercepter = async (ctx: MessageContext<ContextDefaultState> & object, next: Function) => {
  // Используем ctx.scene.current для проверки активности сцены
  if (ctx.scene.current && ctx.text?.startsWith('/')) {
    
    // Очистка сообщений, если они были записаны в стейт сцены
    const messageIds = ctx.scene.state.messageIds;
    if (Array.isArray(messageIds) && messageIds.length > 0) {
      try {
        await vk.api.messages.delete({
          message_ids: messageIds,
          delete_for_all: 1
        });
      } catch (e) {
        console.error('[Scene Intercept] Не удалось удалить сообщения при выходе:', e);
      }
    }

    // Выходим из сцены (состояние ctx.scene.state будет очищено)
    await ctx.scene.leave();
    
    await ctx.send('Создание мероприятия прервано системной командой.');
    
    // Возвращаем пользователя в админ-меню
    return handleAdminAuth(ctx);
  }
  
  return next();
}

export const onAdminEventDelete = async (ctx: MessageContext) => {
  if (!config.adminIds.includes(ctx.senderId)) return;

  const events = await prisma.event.findMany({ where: { deleted: false } });

  const kb = Keyboard.builder();
  events.forEach(event => {
    kb.callbackButton({
      label: event.name.substring(0, 40),
      payload: { action: 'confirm_delete', id: event.id }
    }).row();
  });

  await ctx.send({
    message: 'Какое мероприятие удалить?',
    keyboard: kb.inline()
  });
};

export const onAdminEventList =  async (ctx: MessageContext) => {
  if (!config.adminIds.includes(ctx.senderId)) return;

  const events = await prisma.event.findMany({ where: { deleted: false } });

  if (events.length === 0) {
    return ctx.send('Нет активных мероприятий.');
  }

  const kb = Keyboard.builder();
  events.forEach(event => {
    kb.callbackButton({
      label: event.name.substring(0, 40), // Ограничение ВК на длину кнопки
      payload: { action: 'event_settings', id: event.id }
    }).row();
  });

  await ctx.send({
    message: 'Выберите мероприятие:',
    keyboard: kb.inline() // inline клавиатура привязывается к сообщению
  });
};

export const onAdminEventCreate = async (ctx: MessageContext) => {
  if (config.adminIds.includes(ctx.senderId)) {
    await ctx.scene.enter('create_event');
  }
};