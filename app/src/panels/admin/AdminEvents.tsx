import { FC, useEffect, useState, ReactNode } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, Button, Text, Header, Skeleton, IconButton, Alert, 
  Box, NavIdProps
} from '@vkontakte/vkui';
import { Icon24Cancel } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { deleteEvent, EventData, fetchEvents } from '../../services/adminApi';

// Простая функция для извлечения роли из JWT
const getUserRole = () => {
  try {
    const token = localStorage.getItem('admin_token');
    if (!token) return 'voter';

    const base64Url = token.split('.')[1];
  
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }

    const payload = JSON.parse(atob(base64));
    return payload.role || 'voter';
  } catch (e) {
    return 'voter';
  }
};

export const AdminEventsPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [popout, setPopout] = useState<ReactNode | null>(null);
  
  const role = getUserRole(); // 'admin' или 'voter'

  const loadData = () => {
    setLoading(true);
    fetchEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  const closePopout = () => setPopout(null);

  const openDeleteConfirmation = (eventId: number) => {
    setPopout(
      <Alert
        actionsLayout="horizontal"
        onClose={closePopout}
        actions={[
          { title: 'Нет', mode: 'cancel' },
          { title: 'Да', mode: 'destructive', action: () => confirmDelete(eventId) },
        ]}
        title="Удаление мероприятия" description="Вы уверены что хотите удалить это мероприятие?"
      />
    );
  };

  const confirmDelete = async (eventId: number) => {
    const success = await deleteEvent(eventId);
    if (success) setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleEventClick = (eventId: number) => {
    if (role === 'admin') {
      routeNavigator.push(`/admin/event/${eventId}`);
    } else {
      // Выборщики сразу идут в список заявок
      routeNavigator.push(`/admin/event/${eventId}/requests`);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        {role === 'admin' ? 'Администрирование' : 'Мероприятия'}
      </PanelHeader>

      <Box style={{ maxWidth: 400, width: '100%', margin: '15px auto' }}>
        
        {/* Кнопка создания видна ТОЛЬКО админу */}
        {role === 'admin' && (
          <div style={{ padding: '0 15px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Button 
              size="l" stretched mode="primary" 
              onClick={() => routeNavigator.push('/admin/event')}
            >
              Создать новое мероприятие
            </Button>
            
            {/* НОВАЯ КНОПКА ПЕРСОНАЛА */}
            <Button 
              size="l" stretched mode="secondary" 
              onClick={() => routeNavigator.push('/admin/staff')}
            >
              Управление персоналом
            </Button>
          </div>
        )}

        <Header>Наши мероприятия</Header>
        
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ marginBottom: 10, height: 44, borderRadius: 8 }} />
          ))
        ) : events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} style={{ position: 'relative', margin: '0 15px 10px' }}>
              <Button 
                size="l" stretched mode="secondary" align="left"
                onClick={() => handleEventClick(event.id)}
              >
                <img src={'/api'+event?.image} alt="Event" style={{ width: '100%', borderRadius: 8, marginBottom: 10, marginTop: 15, }} />
                <Box style={{ marginBottom: 10, whiteSpace: 'wrap' }}>{event.date}. {event.title}</Box>
              </Button>

              {/* Крестик удаления виден ТОЛЬКО админу */}
              {role === 'admin' && (
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    openDeleteConfirmation(event.id);
                  }}
                  style={{
                    position: 'absolute', top: -20, right: -20,
                    backgroundColor: 'var(--vkui--color_background_negative)',
                    color: 'white', borderRadius: '50%', transform: 'scale(50%)', zIndex: 2
                  }}
                >
                  <Icon24Cancel width={16} height={16} />
                </IconButton>
              )}
            </div>
          ))
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            К сожалению запланированных мероприятий нет
          </Text>
        )}
      </Box>
      {popout}
    </Panel>
  );
};