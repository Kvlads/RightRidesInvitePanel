import { FC, useEffect, useState, ReactNode } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, Button, Text, Header, Skeleton, IconButton, Alert, 
  Box,
  NavIdProps
} from '@vkontakte/vkui';
import { Icon24Cancel } from '@vkontakte/icons';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { EventData, fetchEvents } from '../../services/api';
import { deleteEvent } from '../../services/adminApi';

export const AdminEventsPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [popout, setPopout] = useState<ReactNode | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const closePopout = () => setPopout(null);

  const openDeleteConfirmation = (id: number) => {
    setPopout(
      <Alert
        actionsLayout="horizontal"
        onClose={closePopout}
        actions={[
          {
            title: 'Нет',
            mode: 'cancel',
          },
          {
            title: 'Да',
            mode: 'destructive',
            action: () => confirmDelete(id),
          },
        ]}
        title="Удаление мероприятия" description="Вы уверены что хотите удалить это мероприятие?"
      />
    );
  };

  const confirmDelete = async (id: number) => {
    const success = await deleteEvent(id);
    if (success) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader 
        before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}
      >
        Администрирование
      </PanelHeader>

      <Box style={{ maxWidth: 400, width: '100%', margin: '15px auto 0', padding: '0 15px' }}>
        <Button 
          size="l" 
          stretched 
          mode="primary" 
          style={{ margin: '10px 0',  }}
          onClick={() => routeNavigator.push('/admin/event')}
        >
          Создать новое мероприятие
        </Button>

        <Header>Наши мероприятия</Header>
        
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ marginBottom: 10, height: 44, borderRadius: 8 }} />
          ))
        ) : events.length > 0 ? (
          events.map((event) => (
            <div key={event.id} style={{ position: 'relative', marginBottom: 10 }}>
              <Button 
                size="l" 
                stretched 
                mode="secondary"
                align="left"
                onClick={() => routeNavigator.push(`/admin/event/${event.id}`)}
              >
                <img src={event?.image} alt="Event" style={{ width: '100%', borderRadius: 8, marginBottom: 10, marginTop: 15, }} />
                <Box style={{ marginBottom: 10 }}>{event.date}. {event.title}</Box>
              </Button>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteConfirmation(event.id);
                }}
                style={{
                  position: 'absolute',
                  top: -20,
                  right: -20,
                  backgroundColor: 'var(--vkui--color_background_negative)',
                  color: 'white',
                  borderRadius: '50%',
                  transform: 'scale(60%)',
                  zIndex: 2
                }}
              >
                <Icon24Cancel width={16} height={16} />
              </IconButton>
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