import { VK, MessageContext } from 'vk-io';
import { HearManager } from '@vk-io/hear';

export const vk = new VK({
  token: process.env.VK_BOT_TOKEN as string
});

// Инициализация менеджера команд
const hearManager = new HearManager<MessageContext>();

// Прокидываем все события 'message_new' в hearManager
vk.updates.on('message_new', hearManager.middleware);

// Обработчик команды "ping"
hearManager.hear(/^ping$/i, async (context) => {
  await context.send('pong');
});

export const startBot = async () => {
  await vk.updates.start();
  console.log('Бот запущен (Long Polling)');
};