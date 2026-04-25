import { FC, useState } from 'react';
import { 
  Panel, PanelHeader, FormItem, Input, 
  Button, Group, Div, Snackbar, NavIdProps 
} from '@vkontakte/vkui';
import { Icon16ErrorCircleFill } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { apiClient } from '../../api/client';

export const AdminLogin: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }


    setLoading(true);
    setError(null);

    try {
      // Отправляем запрос на наш новый эндпоинт
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка авторизации');
      }

      // Сохраняем токен в LocalStorage
      localStorage.setItem('admin_token', data.token);
      
      // Перенаправляем в панель управления
      routeNavigator.push('/admin'); 

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader>Вход для администратора</PanelHeader>

      <Group style={{ maxWidth: 400, margin: '50px auto' }}>
        <FormItem top="Логин">
          <Input 
            value={login} 
            onChange={(e) => setLogin(e.target.value)} 
            placeholder="Введите логин" 
          />
        </FormItem>

        <FormItem top="Пароль">
          <Input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            placeholder="Введите пароль" 
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
          />
        </FormItem>

        <Div>
          <Button 
            size="l" 
            stretched 
            loading={loading} 
            onClick={handleLogin}
          >
            Войти
          </Button>
        </Div>
      </Group>

      {error && (
        <Snackbar
          onClose={() => setError(null)}
          before={<Icon16ErrorCircleFill fill="var(--vkui--color_icon_negative)" />}
        >
          {error}
        </Snackbar>
      )}
    </Panel>
  );
};