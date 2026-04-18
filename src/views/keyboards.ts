// src/views/keyboards.ts
import { Keyboard } from 'vk-io';

export const mainMenuKeyboard = Keyboard.builder()
  .textButton({
    label: 'Список мероприятий',
    color: Keyboard.PRIMARY_COLOR,
  });

export const adminMenuKeyboard = Keyboard.builder()
  .textButton({ label: 'Список мероприятий' })
  .row()
  .textButton({ label: 'Создать мероприятие', color: Keyboard.POSITIVE_COLOR })
  .textButton({ label: 'Удалить мероприятие', color: Keyboard.NEGATIVE_COLOR })
  .oneTime(); // Клавиатура скроется после нажатия, если это необходимо