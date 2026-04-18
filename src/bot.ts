// src/bot.ts
import { VK, MessageContext, Keyboard } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { config } from './config/env';
import { handleStart, handleEventsList } from './controllers/user.controller';
import { adminSceneCommandIntercepter, handleAdminAuth, handleAdminButtons, onAdminEventCreate, onAdminEventDelete, onAdminEventList } from './controllers/admin.controller';
import { registerUserMiddleware } from './middlewares/auth.middleware';
import { mainMenuKeyboard } from './views/keyboards';
import { SessionManager } from '@vk-io/session';
import { SceneManager } from '@vk-io/scenes';
import { createEventScene } from './scenes/createEvent.scene';
import { prisma } from './models/user.model';
import { onEventDeleteMessage, onEventEditMessage } from './controllers/event.controller';

if (!config.vkToken) {
  throw new Error('Критическая ошибка: VK_BOT_TOKEN не задан в .env');
}

export const vk = new VK({
  token: config.vkToken,
});

const sessionManager = new SessionManager();
const sceneManager = new SceneManager();
const hearManager = new HearManager<MessageContext>();

sceneManager.addScenes([createEventScene]);

// 1. Middleware для запрета сообщений из групповых чатов
vk.updates.on('message_new', async (ctx, next) => {
  if (ctx.isChat) return; 
  return next();
});

vk.updates.on('message_new', registerUserMiddleware(vk));
vk.updates.on('message_new', sessionManager.middleware);
vk.updates.on('message_event', sessionManager.middleware);

vk.updates.on('message_event', onEventDeleteMessage);
vk.updates.on('message_new', onEventEditMessage);

vk.updates.on('message_new', sceneManager.middleware);

// Роутинг для администраторов
hearManager.hear('/admin', handleAdminAuth);
hearManager.hear('Создать мероприятие', onAdminEventCreate);
hearManager.hear('Список мероприятий', onAdminEventList);
hearManager.hear('Удалить мероприятие', onAdminEventDelete);

// Перехватчик команд внутри сцены
vk.updates.on('message_new', adminSceneCommandIntercepter);
vk.updates.on('message_new', sceneManager.middlewareIntercept);
vk.updates.on('message_new', hearManager.middleware);

// Роутинг для обычных пользователей
hearManager.hear(/^(начать|start)$/i, handleStart);
hearManager.hear('Список мероприятий', handleEventsList);

hearManager.onFallback(async (ctx) => {
  if (ctx.isOutbox) return;
  await ctx.send({
    message: 'Пожалуйста, используй кнопки меню',
    keyboard: mainMenuKeyboard,
  });
});