import { VK, MessageContext, PhotoAttachment } from 'vk-io';
import { HearManager } from '@vk-io/hear';
import { prisma } from '../prisma/client';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';

export const vk = new VK({
  token: process.env.VK_BOT_TOKEN as string,
  apiTimeout: 30000,
  uploadTimeout: 60000,
});

// Настройка транспортера для отправки почты
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
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

// 1. ФУНКЦИЯ: ОТПРАВКА УВЕДОМЛЕНИЯ О ЗАЯВКЕ В ЧАТ АДМИНОВ
export const sendApprovalRequestToAdmins = async (registrationId: number) => {
  const adminChatId = Number(process.env.ADMIN_CHAT_ID);
  if (!adminChatId) return;

  const reg = await prisma.participant.findUnique({
    where: { id: registrationId },
    include: { event: true, photos: true }
  });

  if (!reg || !reg.photos.length) return;

  // Последовательная загрузка изображений
  const photos = async () => {
    const attachments: PhotoAttachment[] = [];
    for (let index = 0; index < reg.photos.length; index++) {
      const photo = reg.photos[index];
      try {
        const filePath = path.join(process.cwd(), photo.url);
        if (fs.existsSync(filePath)) {
          const result = await vk.upload.messagePhoto({            
            source: { value: filePath, timeout: 60e3 }
          });
          setTimeout(() => {}, 1500); // Небольшая задержка от капчи ВК
          attachments.push(result);
        }
      } catch (e) {
        console.error('[vk_photo_upload photos] upload error:', e);
      }
    }
    return attachments;
  }

  const attachmentStr = (await photos())
    .filter(Boolean)
    .map(p => `photo${p!.ownerId}_${p!.id}`)
    .join(',');

  await prisma.participant.update({
    where: { id: reg.id },
    data: { vkAttachments: attachmentStr }
  });

  // Формируем ссылку на админ-панель (используем APP_URL из .env)
  const baseUrl = process.env.APP_URL || 'https://ваш-домен.ru';
  const voteUrl = `${baseUrl}/#/admin/event/${reg.eventId}/requests`;

  const messageText = `🚗 Новая заявка на «${reg.event.title}»\n\n` +
    `👤 Участник: ${reg.fio}\n` +
    `📧 Email: ${reg.email || 'Не указан'}\n` +
    `🚘 Марка: ${reg.brand}\n` +
    `🔢 Госномер: ${reg.plate}\n` +
    `💬 Комментарий: ${reg.comment || 'Нет комментариев'}\n\n` +
    `🔗 Перейдите в админ-панель для голосования:\n${voteUrl}`;

  try {
    // Отправляем сообщение БЕЗ inline-клавиатуры
    await vk.api.messages.send({
      peer_id: adminChatId,
      message: messageText,
      attachment: attachmentStr,
      random_id: Date.now()
    });
  } catch (e) {
    console.error('[vk_message_send] message send error:', e);
  }
};

// 2. ФУНКЦИЯ: ОТПРАВКА EMAIL УЧАСТНИКУ ПРИ ЗАКРЫТИИ ЗАЯВКИ
export const sendDecisionEmail = async (registrationId: number) => {
  const reg = await prisma.participant.findUnique({
    where: { id: registrationId },
    include: { event: true }
  });

  if (!reg || !reg.email) return;

  const finalStatus = reg.status;
  // Письмо отправляется только если статус финальный
  if (finalStatus === 'pending') return; 

  const fallbackApproved = `🎉 Ваша заявка принята!`;
  const fallbackRejected = `😔 К сожалению, ваша заявка была отклонена.`;
  
  const emailStatusText = finalStatus === 'approved' 
    ? (reg.event.approvalText || fallbackApproved)
    : (reg.event.rejectionText || fallbackRejected);

  const baseUrl = process.env.APP_URL || 'https://ваш-домен.ru';
  const imageUrl = reg.event.image?.startsWith('http') 
    ? reg.event.image 
    : `${baseUrl}${reg.event.image}`;

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

  try {
    await transporter.sendMail({
      from: `"RightRides" <${process.env.SMTP_USER}>`,
      to: reg.email,
      subject: `Заявка: ${reg.event.title}`,
      text: plainTextBody,
      html: htmlBody,
    });
  } catch (err) {
    console.error('Ошибка отправки email:', err);
  }
};

export const startBot = async () => {
  await vk.updates.start();
  console.log('Бот запущен (Long Polling)');
};