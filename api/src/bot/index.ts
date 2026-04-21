import { VK, MessageContext, Keyboard } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { prisma } from '../prisma/client';
import path from 'path';
import fs from 'fs';

export const vk = new VK({
  token: process.env.VK_BOT_TOKEN as string
});

const hearManager = new HearManager<MessageContext>();
vk.updates.on('message_new', hearManager.middleware);

hearManager.hear(/^ping$/i, async (context) => {
  await context.send(`pong! ID этого чата: ${context.peerId}`);
  console.log('Кто-то написал ping. ID чата:', context.peerId);
});

// 1. ФУНКЦИЯ: ОТПРАВКА ЗАЯВКИ В ЧАТ АДМИНИСТРАТОРОВ
export const sendApprovalRequestToAdmins = async (registrationId: number) => {
  const adminChatId = Number(process.env.ADMIN_CHAT_ID);
  if (!adminChatId) return;

  const reg = await prisma.participant.findUnique({
    where: { id: registrationId },
    include: { event: true, photos: true }
  });

  if (!reg || !reg.photos.length) return;

  // Загружаем локальные фото на сервера ВКонтакте
  const uploadedPhotos = await Promise.all(
    reg.photos.map(async (photo) => {
      const filePath = path.join(process.cwd(), photo.url);
      if (fs.existsSync(filePath)) {
        return await vk.upload.messagePhoto({
          source: { value: filePath }
        });
      }
      return null;
    })
  );

  // Формируем строку вложений (вида photo123_456,photo123_457)
  const attachmentStr = uploadedPhotos
    .filter(Boolean)
    .map(p => `photo${p!.ownerId}_${p!.id}`)
    .join(',');

  // Сохраняем вложения в БД, чтобы использовать их при редактировании сообщения позже
  await prisma.participant.update({
    where: { id: reg.id },
    data: { vkAttachments: attachmentStr }
  });

  const messageText = `🚗 Новая заявка на «${reg.event.title}»\n\n` +
    `👤 Участник: ${reg.fio}\n` +
    `🚘 Марка: ${reg.brand}\n` +
    `🔢 Госномер: ${reg.plate}\n\n` +
    `Голоса ЗА:\n` +
    `Голоса ПРОТИВ:\n`;

  // Создаем клавиатуру с Callback-кнопками
  const keyboard = Keyboard.builder()
    .callbackButton({ label: 'За', payload: { cmd: 'vote', regId: reg.id, decision: 'yes' }, color: 'positive' })
    .callbackButton({ label: 'Против', payload: { cmd: 'vote', regId: reg.id, decision: 'no' }, color: 'negative' })
    .inline();

  await vk.api.messages.send({
    peer_id: adminChatId,
    message: messageText,
    attachment: attachmentStr,
    keyboard,
    random_id: Date.now()
  });
};

// 2. ОБРАБОТЧИК: НАЖАТИЕ НА КНОПКИ ГОЛОСОВАНИЯ
vk.updates.on('message_event', async (context) => {
  const { eventPayload, userId, peerId, conversationMessageId } = context;

  if (eventPayload?.cmd === 'vote') {
    const { regId, decision } = eventPayload;

    // 1. СНАЧАЛА ПРОВЕРЯЕМ, существует ли заявка в базе
    const reg = await prisma.participant.findUnique({
      where: { id: regId },
      include: { event: true, user: true }
    });

    if (!reg) {
      // Если заявки нет, редактируем старое сообщение, убирая кнопки
      await vk.api.messages.edit({
        peer_id: peerId,
        conversation_message_id: conversationMessageId,
        message: '⚠️ Данная заявка была удалена из базы данных.',
        keyboard: Keyboard.builder().inline() // Очищаем кнопки
      }).catch(() => {}); // Игнорируем ошибку, если сообщение слишком старое для редактирования

      return context.answer({ type: 'show_snackbar', text: 'Ошибка: Заявка больше не существует' });
    }

    // 2. Получаем имя админа, который нажал кнопку
    const [vkUser] = await vk.api.users.get({ user_ids: [userId] });
    const adminName = `${vkUser.first_name} ${vkUser.last_name}`;

    // 3. ТЕПЕРЬ безопасно сохраняем голос
    await prisma.vote.upsert({
      where: { participantId_vkId: { participantId: regId, vkId: userId } },
      update: { decision, name: adminName },
      create: { participantId: regId, vkId: userId, name: adminName, decision }
    });

    // 4. Получаем актуальный список всех голосов для этой заявки
    const updatedVotes = await prisma.vote.findMany({
      where: { participantId: regId }
    });

    const yesVotes = updatedVotes.filter(v => v.decision === 'yes');
    const noVotes = updatedVotes.filter(v => v.decision === 'no');

    // Получаем список участников чата для подсчета 70%
    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });
    const humanMembers = members.profiles.length; 
    const threshold = Math.ceil(humanMembers * 0.7);

    let finalStatus = reg.status; // Берем текущий статус

    // Проверяем порог только если статус всё ещё pending
    if (finalStatus === 'pending') {
      if (yesVotes.length >= threshold) finalStatus = 'approved';
      else if (noVotes.length >= threshold) finalStatus = 'rejected';
    }

    // Формируем новый текст сообщения
    let newText = `🚗 Заявка на «${reg.event.title}»\n\n` +
      `👤 Участник: ${reg.fio}\n🚘 Марка: ${reg.brand}\n🔢 Госномер: ${reg.plate}\n\n` +
      `✅ Голоса ЗА (${yesVotes.length}):\n${yesVotes.map(v => `- ${v.name}`).join('\n')}\n\n` +
      `❌ Голоса ПРОТИВ (${noVotes.length}):\n${noVotes.map(v => `- ${v.name}`).join('\n')}\n`;

    // ЕСЛИ ПОРОГ ПРОЙДЕН (или статус уже был изменен ранее)
    if (finalStatus !== 'pending') {
      newText += `\n🎯 РЕШЕНИЕ: ${finalStatus === 'approved' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}`;
      
      // Обновляем статус в БД только если он реально поменялся
      if (reg.status === 'pending') {
        await prisma.participant.update({
          where: { id: regId },
          data: { status: finalStatus }
        });

        // Отправляем личное сообщение пользователю
        const fallbackApproved = `🎉 Ваша заявка на мероприятие «${reg.event.title}» принята!`;
        const fallbackRejected = `😔 К сожалению, ваша заявка на мероприятие «${reg.event.title}» была отклонена.`;

        await vk.api.messages.send({
          user_id: Number(reg.user.vkId),
          message: finalStatus === 'approved' 
            ? (reg.event.approvalText || fallbackApproved)
            : (reg.event.rejectionText || fallbackRejected),
          random_id: Math.floor(Math.random() * 1e15)
        }).catch(err => console.error('Ошибка отправки ЛС пользователю:', err));

      }

      // Редактируем сообщение в админском чате (убираем кнопки)
      await vk.api.messages.edit({
        peer_id: peerId,
        conversation_message_id: conversationMessageId,
        message: newText,
        attachment: reg.vkAttachments || '',
        keyboard: Keyboard.builder().inline() 
      });

      return context.answer({ type: 'show_snackbar', text: 'Голосование завершено!' });
    }

    // ЕСЛИ ГОЛОСОВАНИЕ ЕЩЕ ИДЕТ (обновляем текст и счетчики на кнопках)
    const updatedKeyboard = Keyboard.builder()
      .callbackButton({ label: `За (${yesVotes.length})`, payload: { cmd: 'vote', regId, decision: 'yes' }, color: 'positive' })
      .callbackButton({ label: `Против (${noVotes.length})`, payload: { cmd: 'vote', regId, decision: 'no' }, color: 'negative' })
      .inline();

    await vk.api.messages.edit({
      peer_id: peerId,
      conversation_message_id: conversationMessageId,
      message: newText,
      attachment: reg.vkAttachments || '',
      keyboard: updatedKeyboard
    });

    await context.answer({ type: 'show_snackbar', text: 'Ваш голос учтен!' });
  }
});

export const startBot = async () => {
  await vk.updates.start();
  console.log('Бот запущен (Long Polling)');
};