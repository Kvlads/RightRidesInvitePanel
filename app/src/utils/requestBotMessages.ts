import bridge from "@vkontakte/vk-bridge";

/**
 * Запрос разрешения на получение сообщений от сообщества.
 * @param groupId ID вашего сообщества
 */
export const requestAllowMessages = async (groupId: number): Promise<boolean> => {
  try {
    const data = await bridge.send('VKWebAppAllowMessagesFromGroup', {
      group_id: groupId,
    });
    
    // Результат: { result: true } — пользователь разрешил
    return data.result === true;
  } catch (error) {
    console.error('Ошибка при запросе разрешений:', error);
    return false;
  }
};