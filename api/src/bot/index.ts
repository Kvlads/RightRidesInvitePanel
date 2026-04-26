import { VK, MessageContext, Keyboard } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { prisma } from '../prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export const vk = new VK({
  token: process.env.VK_BOT_TOKEN as string
});

// Получаем порт из .env или используем 465 по умолчанию
const smtpPort = Number(process.env.SMTP_PORT) || 465;

// Настройка транспортера для отправки почты
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  // Если порт 465 — ставим true. Если 587 или любой другой — ставим false
  secure: smtpPort === 465, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const hearManager = new HearManager<MessageContext>();
vk.updates.on('message_new', hearManager.middleware);

hearManager.hear(/^ping$/i, async (context) => {
  await context.send(`pong! ID этого чата: ${context.peerId}`);
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

  const attachmentStr = uploadedPhotos
    .filter(Boolean)
    .map(p => `photo${p!.ownerId}_${p!.id}`)
    .join(',');

  await prisma.participant.update({
    where: { id: reg.id },
    data: { vkAttachments: attachmentStr }
  });

  const messageText = `🚗 Новая заявка на «${reg.event.title}»\n\n` +
    `👤 Участник: ${reg.fio}\n` +
    `📧 Email: ${reg.email || 'Не указан'}\n` +
    `🚘 Марка: ${reg.brand}\n` +
    `🔢 Госномер: ${reg.plate}\n` +
    `💬 Комментарий: ${reg.comment || 'Нет комментариев'}\n\n` + // <--- Добавили
    `Голоса ЗА:\n` +
    `Голоса ПРОТИВ:\n`;

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

    // 1. СРАЗУ отвечаем ВКонтакте, чтобы кнопка не зависала (решает ошибку invalid event_id)
    await context.answer({ 
      type: 'show_snackbar', 
      text: decision === 'yes' ? 'Голосуем ЗА...' : 'Голосуем ПРОТИВ...' 
    }).catch(() => {});

    // 2. Ищем заявку
    const reg = await prisma.participant.findUnique({
      where: { id: regId },
      include: { event: true } 
    });

    if (!reg) {
      // Если заявка реально удалена, просто заменяем сообщение на текст-заглушку
      await vk.api.messages.edit({
        peer_id: peerId,
        conversation_message_id: conversationMessageId,
        message: '⚠️ Данная заявка была удалена из базы данных.',
        keyboard: Keyboard.builder().inline() 
      }).catch(() => {});
      return; 
    }

    // 3. Сохраняем голос
    const [vkUser] = await vk.api.users.get({ user_ids: [userId] });
    const adminName = `${vkUser.first_name} ${vkUser.last_name}`;

    await prisma.vote.upsert({
      where: { participantId_vkId: { participantId: regId, vkId: userId } },
      update: { decision, name: adminName },
      create: { participantId: regId, vkId: userId, name: adminName, decision }
    });

    // 4. Считаем голоса
    const updatedVotes = await prisma.vote.findMany({
      where: { participantId: regId }
    });

    const yesVotes = updatedVotes.filter(v => v.decision === 'yes');
    const noVotes = updatedVotes.filter(v => v.decision === 'no');

    const members = await vk.api.messages.getConversationMembers({ peer_id: peerId });
    const humanMembers = members.profiles.length; 
    const threshold = Math.ceil(humanMembers * 0.7);

    let finalStatus = reg.status; 

    if (finalStatus === 'pending') {
      if (yesVotes.length >= threshold) finalStatus = 'approved';
      else if (noVotes.length >= threshold) finalStatus = 'rejected';
    }

    let newText = `🚗 Заявка на «${reg.event.title}»\n\n` +
      `👤 Участник: ${reg.fio}\n` +
      `📧 Email: ${reg.email || 'Не указан'}\n` +
      `🚘 Марка: ${reg.brand}\n` +
      `🔢 Госномер: ${reg.plate}\n` +
      `💬 Комментарий: ${reg.comment || 'Нет комментариев'}\n\n` + // <--- Добавили
      `✅ Голоса ЗА (${yesVotes.length}):\n${yesVotes.map(v => `- ${v.name}`).join('\n')}\n\n` +
      `❌ Голоса ПРОТИВ (${noVotes.length}):\n${noVotes.map(v => `- ${v.name}`).join('\n')}\n`;

    // 5. ЕСЛИ ПОРОГ ПРОЙДЕН — Закрываем голосование
    if (finalStatus !== 'pending') {
      newText += `\n🎯 РЕШЕНИЕ: ${finalStatus === 'approved' ? 'ОДОБРЕНО' : 'ОТКЛОНЕНО'}`;
      
      // Выполняем действия, только если статус меняется ВПЕРВЫЕ
      if (reg.status === 'pending') {
        await prisma.participant.update({
          where: { id: regId },
          data: { status: finalStatus }
        });

        // Отправка EMAIL пользователю
        if (reg.email) {
          const fallbackApproved = `🎉 Ваша заявка принята!`;
          const fallbackRejected = `😔 К сожалению, ваша заявка была отклонена.`;
          
          const emailStatusText = finalStatus === 'approved' 
            ? (reg.event.approvalText || fallbackApproved)
            : (reg.event.rejectionText || fallbackRejected);

          const baseUrl = process.env.APP_URL || 'https://ваш-домен.ru';
          const imageUrl = reg.event.image?.startsWith('http') 
            ? reg.event.image 
            : `${baseUrl}${reg.event.image}`;

          // 1. Полноценный HTML-каркас с данными об авто
          const htmlBody = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; background-color: #f9f9f9;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #eaeaea;">
                <tr>
                  <td style="padding: 30px; font-family: Arial, sans-serif; color: #333333;">
                    <h1 style="margin-top: 0; color: #000000; font-size: 24px;">${reg.event.title}</h1>
                    
                    ${reg.event.image ? `
                      <img 
                        src="${imageUrl}" 
                        alt="Анонс мероприятия" 
                        style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px; display: block;" 
                      />
                    ` : ''}
                    
                    <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Здравствуйте, ${reg.fio}!<br><br>
                      ${emailStatusText}
                    </p>

                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                      <h3 style="margin-top: 0; font-size: 14px; color: #666; text-transform: uppercase;">Данные автомобиля:</h3>
                      <p style="margin: 5px 0; font-size: 16px;"><strong>Марка:</strong> ${reg.brand}</p>
                      <p style="margin: 5px 0; font-size: 16px;"><strong>Госномер:</strong> ${reg.plate}</p>
                    </div>

                    <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0 20px;" />
                    <p style="font-size: 12px; color: #999999; margin: 0; text-align: center;">
                      Это автоматическое сообщение. Пожалуйста, не отвечайте на него.<br>
                      С уважением, команда RightRides.
                    </p>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;

          // 2. Текстовая версия
          const plainTextBody = `
Здравствуйте, ${reg.fio}!

Статус вашей заявки на мероприятие «${reg.event.title}»:
${emailStatusText}

Данные автомобиля в заявке:
Марка: ${reg.brand}
Госномер: ${reg.plate}

---
Это автоматическое сообщение. Пожалуйста, не отвечайте на него.
С уважением, команда RightRides.
          `.trim();

          transporter.sendMail({
            from: `"RightRides" <${process.env.SMTP_USER}>`,
            to: reg.email,
            subject: `Заявка: ${reg.event.title}`,
            text: plainTextBody,
            html: htmlBody,
          }).catch(err => console.error('Ошибка отправки email:', err));
        }
      }

      // Обновляем сообщение (убираем кнопки)
      await vk.api.messages.edit({
        peer_id: peerId,
        conversation_message_id: conversationMessageId,
        message: newText,
        attachment: reg.vkAttachments || '',
        keyboard: Keyboard.builder().inline() 
      }).catch(() => {});

      return; 
    }

    // 6. ЕСЛИ ГОЛОСОВАНИЕ ПРОДОЛЖАЕТСЯ — Обновляем счетчики на кнопках
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
    }).catch(() => {});

    return;
  }
});

export const startBot = async () => {
  await vk.updates.start();
  console.log('Бот запущен (Long Polling)');
};