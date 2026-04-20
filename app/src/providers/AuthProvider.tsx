// src/providers/AuthProvider.tsx
import React, { useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { apiClient } from '../api/client';
import { Button, Panel, PanelSpinner, Placeholder, View } from '@vkontakte/vkui';
import { Icon56ErrorOutline } from '@vkontakte/icons';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Инициализируем сам VK Bridge
        await bridge.send('VKWebAppInit');

        // 2. Получаем данные пользователя из ВКонтакте
        const vkUser = await bridge.send('VKWebAppGetUserInfo');
        const fullName = `${vkUser.first_name} ${vkUser.last_name}`;

        console.warn('vkUser, fullName', vkUser, fullName)

        // 3. Стучимся на наш бэкенд через созданный клиент
        // apiClient сам подставит нужные заголовки
        const response = await apiClient<{ message: string; user: any }>('/init', {
          method: 'POST',
          body: { name: fullName }
        });

        console.log('Пользователь авторизован:', response.user);
        
        // 4. Всё отлично, пускаем пользователя в приложение
        setStatus('success');

      } catch (error: any) {
        console.error('Ошибка инициализации:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Не удалось подключиться к серверу');
      }
    };

    initApp();
  }, []);

  // Экран загрузки (здесь можно подставить красивый спиннер из VK UI)
  if (status === 'loading') {
    return (
      <View activePanel="loading">
        <Panel id="loading">
          <PanelSpinner size="l" style={{ height: '100vh' }} />
        </Panel>
      </View>
    );
  }

  // Экран критической ошибки: доступ заблокирован
  if (status === 'error') {
    return (
      <View activePanel="error">
        <Panel id="error" centered>
          <Placeholder
            icon={<Icon56ErrorOutline fill="var(--vkui--color_icon_negative)" />}
            title="Ошибка доступа"
            action={
              <Button size="m" onClick={() => window.location.reload()}>
                Перезапустить приложение
              </Button>
            }
          >
            {errorMessage}
          </Placeholder>
        </Panel>
      </View>
    );
  }

  // Если status === 'success', рендерим роутинг и страницы
  return <>{children}</>;
};