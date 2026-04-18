// src/scenes/createEvent.scene.ts
import { StepScene } from '@vk-io/scenes';
import { Keyboard } from 'vk-io';
import { prisma } from '../models/user.model';
import { vk } from '../bot';

const yesNoKeyboard = Keyboard.builder()
  .textButton({ label: 'Да', color: Keyboard.POSITIVE_COLOR })
  .textButton({ label: 'Нет', color: Keyboard.NEGATIVE_COLOR })
  .oneTime();

export const createEventScene = new StepScene('create_event', [
  // Шаг 0: Название
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      // Сохраняем ID сообщений бота, чтобы потом их удалить при отмене
      const msg = await ctx.send('Введите название мероприятия:');
      ctx.scene.state.messageIds = [msg.id];
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id); // ID сообщения пользователя
    ctx.scene.state.name = ctx.text;
    return ctx.scene.step.next();
  },

  // Шаг 1: Дата проведения
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send('Введите дату проведения в формате ДД.ММ.ГГ:');
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.eventDate = ctx.text;
    return ctx.scene.step.next();
  },

  // Шаг 2: Дата окончания регистрации
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send('Введите дату окончания регистрации (ДД.ММ.ГГ):');
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.regEndDate = ctx.text;
    return ctx.scene.step.next();
  },

  // Шаг 3: Фото
  async (ctx) => {
    if (ctx.scene.step.firstTime) {
      const msg = await ctx.send('Отправьте фото для анонса:');
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    
    ctx.scene.state.messageIds.push(ctx.id);
    
    // Проверяем наличие прикрепленного фото
    if (ctx.hasAttachments('photo')) {
      const photo = ctx.getAttachments('photo')[0];
      // Формируем строковый ID: photo[owner_id]_[media_id]
      ctx.scene.state.photoId = `photo${photo.ownerId}_${photo.id}`;
    } else {
      ctx.scene.state.photoId = null;
    }
    return ctx.scene.step.next();
  },

  // Шаг 4: Макс. количество гостей
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send('Максимальное количество гостей (0 - бесконечно):');
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.maxGuests = Number(ctx.text) || 0;
    return ctx.scene.step.next();
  },

  // Шаг 5: Макс. количество участников
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send('Максимальное количество участников (0 - бесконечно):');
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.maxParticipants = Number(ctx.text) || 0;
    return ctx.scene.step.next();
  },

  // Шаг 6: Требуется регистрация гостей?
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send({
        message: 'Требуется ли регистрация гостей?',
        keyboard: yesNoKeyboard
      });
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.isGuestRegRequired = ctx.text.toLowerCase() === 'да';
    return ctx.scene.step.next();
  },

  // Шаг 7: Требуется одобрение участников?
  async (ctx) => {
    if (ctx.scene.step.firstTime || !ctx.text) {
      const msg = await ctx.send({
        message: 'Требуется ли одобрение участников?',
        keyboard: yesNoKeyboard
      });
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }
    ctx.scene.state.messageIds.push(ctx.id);
    ctx.scene.state.isApprovalRequired = ctx.text.toLowerCase() === 'да';
    return ctx.scene.step.next();
  },

  // Шаг 8: Предпросмотр и сохранение
  async (ctx) => {
    const s = ctx.scene.state;
    
    if (ctx.scene.step.firstTime) {
      const previewText = `ПРЕДПРОСМОТР:\nНазвание: ${s.name}\nДата: ${s.eventDate}\nОкончание рег.: ${s.regEndDate}\nМакс. гостей: ${s.maxGuests === 0 ? 'Бесконечно' : s.maxGuests}\nМакс. участников: ${s.maxParticipants === 0 ? 'Бесконечно' : s.maxParticipants}\nРег. гостей: ${s.isGuestRegRequired ? 'Да' : 'Нет'}\nОдобрение: ${s.isApprovalRequired ? 'Да' : 'Нет'}`;

      const finishKeyboard = Keyboard.builder()
        .textButton({ label: 'Сохранить', color: Keyboard.POSITIVE_COLOR })
        .textButton({ label: 'Отменить', color: Keyboard.NEGATIVE_COLOR })
        .oneTime();

      const msg = await ctx.send({
        message: previewText,
        attachment: s.photoId,
        keyboard: finishKeyboard
      });
      ctx.scene.state.messageIds.push(msg.id);
      return;
    }

    if (ctx.text === 'Сохранить') {
      console.log('---[ НОВОЕ МЕРОПРИЯТИЕ ]---', s);
      
      await prisma.event.create({
        data: {
          name: s.name,
          eventDate: s.eventDate,
          regEndDate: s.regEndDate,
          photoId: s.photoId,
          maxGuests: s.maxGuests,
          maxParticipants: s.maxParticipants,
          isGuestRegRequired: s.isGuestRegRequired,
          isApprovalRequired: s.isApprovalRequired,
        }
      });

      await ctx.send('Мероприятие успешно сохранено!');
      return ctx.scene.leave();
    }

    if (ctx.text === 'Отменить') {
      await ctx.send('Создание мероприятия отменено. Очистка...');
      
      // Попытка удалить сообщения диалога с ботом
      try {
        await vk.api.messages.delete({
          message_ids: s.messageIds,
          delete_for_all: 1
        });
      } catch (e) {
        console.error('Не удалось удалить сообщения:', e);
      }

      return ctx.scene.leave(); // leave() автоматически очищает кеш сцены (ctx.scene.state)
    }
  }
]);