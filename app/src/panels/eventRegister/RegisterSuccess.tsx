import { FC } from 'react';
import { Panel, Placeholder, Button, NavIdProps, Box } from '@vkontakte/vkui';
import { Icon56CheckCircleOutline } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export const SuccessPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();

  return (
    <Panel id={id}>
      <Box style={{ maxWidth: 500, margin: '0 auto 0', padding: '0 15px', height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Placeholder
          style={{ flexGrow: 1 }}
          icon={
            <div style={{ 
              backgroundColor: 'var(--vkui--color_icon_positive)', 
              color: 'var(--vkui--color_icon_contrast)',
              borderRadius: '50%', 
              padding: 24, 
              display: 'inline-flex' 
            }}>
              <Icon56CheckCircleOutline fill="currentColor" width={56} height={56} />
            </div>
          }
          title="Успешная регистрация на мероприятие. Решение по вашей заявке будет отправлено вам на почту!"
          action={
            <Button size="m" mode="primary" onClick={() => routeNavigator.push('/')}>
              Вернуться на главную
            </Button>
          }
        />
      </Box>
    </Panel>
  );
};