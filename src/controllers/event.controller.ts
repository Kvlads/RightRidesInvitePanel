import { ContextDefaultState, Keyboard, MessageContext, MessageEventContext } from "vk-io";
import { prisma } from "../models/user.model";
import { vk } from "../bot"; // Импортируем экземпляр vk

export const onEventEditMessage = async (ctx: MessageContext<ContextDefaultState> & object, next: Function) => {
  if (!ctx.session.editState) {
    return next();
  }

  const { eventId, field } = ctx.session.editState;

  if (ctx.text && ctx.text.toLowerCase() === 'отмена') {
    ctx.session.editState = null;
    await ctx.send('Редактирование отменено.');
    return;
  }

  try {
    let newValue: any = ctx.text;

    if (field === 'maxGuests' || field === 'maxParticipants') {
      newValue = Number(ctx.text);
      if (isNaN(newValue)) {
        await ctx.send('Пожалуйста, введите число. Попробуйте еще раз или напишите "Отмена".');
        return;
      }
    } else if (field === 'photoId') {
      if (ctx.hasAttachments('photo')) {
        const photo = ctx.getAttachments('photo')[0];
        newValue = `photo${photo.ownerId}_${photo.id}`;
      } else {
        await ctx.send('Пожалуйста, отправьте фотографию. Попробуйте еще раз или напишите "Отмена".');
        return;
      }
    }

    await prisma.event.update({
      where: { id: eventId },
      data: { [field]: newValue }
    });

    ctx.session.editState = null;
    await ctx.send('Значение успешно обновлено!');

  } catch (error) {
    console.error('[EditEvent] Ошибка при обновлении мероприятия:', error);
    await ctx.send('Произошла ошибка при сохранении в базу данных.');
    ctx.session.editState = null;
  }
}

export const onEventDeleteMessage = async (ctx: MessageEventContext) => {
  const payload = ctx.eventPayload as any;

  if (payload.action === 'confirm_delete') {
    const event = await prisma.event.findUnique({ where: { id: payload.id } });
    
    const kb = Keyboard.builder()
      .callbackButton({ label: 'Да', payload: { action: 'do_delete', id: payload.id }, color: Keyboard.NEGATIVE_COLOR })
      .callbackButton({ label: 'Нет', payload: { action: 'cancel_delete' }, color: Keyboard.SECONDARY_COLOR })
      .inline();

    await ctx.answer();
    // Используем vk.api вместо ctx.vk.api
    await vk.api.messages.edit({
      peer_id: ctx.peerId,
      conversation_message_id: ctx.conversationMessageId,
      message: `Удалить мероприятие "${event?.name}"?`,
      keyboard: kb
    });
  }

  if (payload.action === 'do_delete') {
    await prisma.event.update({
      where: { id: payload.id },
      data: { deleted: true }
    });
    
    await ctx.answer();
    // Используем vk.api
    await vk.api.messages.edit({
      peer_id: ctx.peerId,
      conversation_message_id: ctx.conversationMessageId,
      message: 'Мероприятие удалено.'
    });
  }

  if (payload.action === 'cancel_delete') {
    await ctx.answer();
    // Используем vk.api
    await vk.api.messages.edit({
      peer_id: ctx.peerId,
      conversation_message_id: ctx.conversationMessageId,
      message: 'Действие отменено.'
    });
  }

  if (payload.action === 'event_settings') {
    const kb = Keyboard.builder()
      .callbackButton({ label: 'Выгрузка участников', payload: { action: 'dev_feature' } }).row()
      .callbackButton({ label: 'Выгрузка гостей', payload: { action: 'dev_feature' } }).row()
      .callbackButton({ label: 'Изменить мероприятие', payload: { action: 'edit_event_menu', id: payload.id } }).inline();

    await ctx.answer();
    // Используем vk.api
    await vk.api.messages.edit({
      peer_id: ctx.peerId,
      conversation_message_id: ctx.conversationMessageId,
      message: 'Настройки мероприятия:',
      keyboard: kb
    });
  }

  if (payload.action === 'edit_event_menu') {
    const eventId = payload.id;
    
    // Группируем кнопки, чтобы уложиться в лимит 6 рядов (у нас получится 5)
    // Немного сократим названия, чтобы они красиво смотрелись по две в ряд
    const kb = Keyboard.builder()
      // 1 ряд
      .callbackButton({ label: 'Название', payload: { action: 'edit_field', id: eventId, field: 'name' } }).row()
      // 2 ряд (две кнопки)
      .callbackButton({ label: 'Дата начала', payload: { action: 'edit_field', id: eventId, field: 'eventDate' } })
      .callbackButton({ label: 'Дата оконч.', payload: { action: 'edit_field', id: eventId, field: 'regEndDate' } }).row()
      // 3 ряд (две кнопки)
      .callbackButton({ label: 'Макс. гостей', payload: { action: 'edit_field', id: eventId, field: 'maxGuests' } })
      .callbackButton({ label: 'Макс. участн.', payload: { action: 'edit_field', id: eventId, field: 'maxParticipants' } }).row()
      // 4 ряд
      .callbackButton({ label: 'Фото для анонса', payload: { action: 'edit_field', id: eventId, field: 'photoId' } }).row()
      // 5 ряд
      .callbackButton({ label: 'Назад', payload: { action: 'event_settings', id: eventId }, color: Keyboard.NEGATIVE_COLOR })
      .inline();

    await ctx.answer();
    await vk.api.messages.edit({
      peer_id: ctx.peerId,
      conversation_message_id: ctx.conversationMessageId,
      message: `Выберите поле для изменения ${payload.id}:`,
      keyboard: kb
    });
  }

  if (payload.action === 'edit_field') {
    ctx.session.editState = {
      eventId: payload.id,
      field: payload.field
    };

    await ctx.answer();
    // Используем vk.api
    await vk.api.messages.send({
      peer_id: ctx.peerId,
      random_id: Math.random(),
      message: `Введите новое значение для поля. \nДля отмены напишите "Отмена".`
    });
  }

  if (payload.action === 'dev_feature') {
    await ctx.answer({
      type: 'show_snackbar',
      text: 'Ещё в разработке'
    });
  }
}