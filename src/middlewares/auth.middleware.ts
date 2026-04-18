// src/middlewares/auth.middleware.ts
import { MessageContext, VK } from 'vk-io';
import { getUserById, findOrCreateUser } from '../models/user.model';

// Экспортируем функцию, которая принимает экземпляр VK и возвращает middleware
export const registerUserMiddleware = (vk: VK) => async (ctx: MessageContext, next: Function) => {
  if (ctx.isOutbox) {
    return next();
  }

  const vkId = ctx.senderId;

  try {
    let user = await getUserById(vkId);

    if (!user) {
      console.log(`[Auth] Новый пользователь ${vkId}. Выполняю регистрацию...`);
      
      // Используем переданный экземпляр vk
      const [userInfo] = await vk.api.users.get({
        user_ids: [vkId],
      });

      user = await findOrCreateUser(
        vkId, 
        userInfo.first_name || 'Без имени', 
        userInfo.last_name || 'Без фамилии'
      );
    }

    ctx.state.user = user;

  } catch (error) {
    console.error(`[Auth] Ошибка при проверке/регистрации пользователя ${vkId}:`, error);
  }

  return next();
};