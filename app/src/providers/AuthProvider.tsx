// src/providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import bridge from '@vkontakte/vk-bridge';
import { View, Panel, PanelSpinner, Placeholder, Button } from '@vkontakte/vkui';
import { Icon56ErrorOutline } from '@vkontakte/icons';
import { apiClient } from '../api/client';

// 1. Описываем, какие данные будут лежать в нашем глобальном контексте
interface AuthContextType {
  user: any; // Здесь лучше использовать тип User из вашей схемы Prisma
  isAdmin: boolean;
}

// 2. Создаем сам контекст
const AuthContext = createContext<AuthContextType | null>(null);

// 3. Создаем удобный хук, чтобы доставать данные в любом компоненте
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // 4. Добавляем состояния для пользователя и флага админа
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await bridge.send('VKWebAppInit');
        const vkUser = await bridge.send('VKWebAppGetUserInfo');
        const fullName = `${vkUser.first_name} ${vkUser.last_name}`;

        const response = await apiClient<{ message: string; user: any; isAdmin: boolean }>('/init', {
          method: 'POST',
          body: { name: fullName }
        });

        // 5. Сохраняем полученные данные в стейт
        setUser(response.user);
        setIsAdmin(response.isAdmin);
        setStatus('success');

      } catch (error: any) {
        console.error('Ошибка инициализации:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Не удалось подключиться к серверу');
      }
    };

    initApp();
  }, []);

  if (status === 'loading') {
    return (
      <View activePanel="loading">
        <Panel id="loading">
          <PanelSpinner size="l" style={{ height: '100vh' }} />
        </Panel>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View activePanel="error">
        <Panel id="error" centered>
          <Placeholder
            icon={<Icon56ErrorOutline fill="var(--vkui--color_icon_negative)" />}
            title="Ошибка доступа"
            action={<Button size="m" onClick={() => window.location.reload()}>Перезапустить</Button>}
          >
            {errorMessage}
          </Placeholder>
        </Panel>
      </View>
    );
  }

  // 6. Оборачиваем children в провайдер и передаем туда наши значения
  return (
    <AuthContext.Provider value={{ user, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};