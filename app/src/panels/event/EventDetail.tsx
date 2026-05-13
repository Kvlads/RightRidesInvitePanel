import { FC, useEffect, useState } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, Group, 
  Title, Text, Skeleton, Button, 
  NavIdProps,
  Box,
} from '@vkontakte/vkui';
// Импортируем иконку для внешней ссылки
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { EventDetail, fetchEventById } from '../../services/api';
import { Icon16Link } from '@vkontakte/icons';

// Вспомогательная функция для проверки открытой регистрации
const checkIsRegistrationOpen = (regEndStr?: string) => {
  if (!regEndStr) return false;
  
  // Разбиваем строку "DD.MM.YYYY" на части
  const [day, month, year] = regEndStr.split('.');
  
  // Создаем дату дедлайна, устанавливая конец дня (23:59:59)
  const deadline = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59);
  
  // Возвращаем true, если сейчас время меньше дедлайна
  return Date.now() <= deadline.getTime();
};

const EventDetailPanel: FC<NavIdProps> = ({ id }) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetchEventById(Number(params.id)).then((data) => {
        setEvent(data);
        setLoading(false);
      });
    }
  }, [params?.id]);

  // Вычисляем флаг видимости кнопки
  const isRegistrationOpen = checkIsRegistrationOpen(event?.regEnd);

  // Обработчик клика по кнопке регистрации
  const handleRegisterClick = () => {
    if (event?.customRegister) {
      // Если есть внешняя ссылка - открываем её в новой вкладке
      window.open(event.customRegister, '_blank', 'noopener,noreferrer');
    } else {
      // Иначе переходим на внутреннюю форму регистрации
      routeNavigator.push(`/event/${params?.id}/register`);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        {event?.title}
      </PanelHeader>

      <Box style={{ maxWidth: 500, width: '100%', margin: '0 auto 0' }}>
        {loading ? (
          <Skeleton style={{ height: 500, width: '100%', marginBottom: 16 }} />
        ) : (
          <Group style={{ padding: '15px' }}>
            <Title level="1" style={{ marginBottom: 8 }}>{event?.title}</Title>
            <img 
              src={event?.image?.startsWith('/') ? `/api${event.image}` : event?.image} 
              alt="Event" 
              style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} 
            />
            
            <Text style={{ marginBottom: 4 }}>Дата: <b>{event?.dateStart}</b></Text>
            
            {/* Меняем цвет текста на красный, если регистрация закрылась, для наглядности */}
            {event?.registerOpen && (
              <Text 
                weight="2" 
                style={{ 
                  marginBottom: 16, 
                  color: isRegistrationOpen ? 'inherit' : 'var(--vkui--color_text_negative)' 
                }}
              >
                {isRegistrationOpen ? 'Окончание регистрации: ' : 'Регистрация закрыта: '}
                <b>{event?.regEnd}</b>
              </Text>
            )}
            
            <Text style={{ marginBottom: 24, whiteSpace: 'pre-wrap' }}>{event?.description}</Text>

            {/* Рендерим кнопку ТОЛЬКО если дата регистрации еще не прошла */}
            {isRegistrationOpen && event?.registerOpen && (
              <Button 
                size="l"
                stretched
                mode="primary"
                style={{ marginBottom: 8 }}
                onClick={handleRegisterClick}
                after={event?.customRegister ? <Icon16Link /> : undefined}
              >
                Регистрация
              </Button>
            )}

            {/* <Button 
              size="l"
              stretched
              mode="secondary"
              onClick={() => routeNavigator.push(`/event/${params?.id}/requests`)}
              after={
                userStatus?.hasNewNotifications ? (
                  <Counter size="s">1</Counter>
                ) : null
              }
            >
              Мои заявки
            </Button> */}
          </Group>
        )}
      </Box>
    </Panel>
  );
};

export default EventDetailPanel;