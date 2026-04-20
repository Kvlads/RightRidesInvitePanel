import { FC, useEffect, useState } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, Group, 
  Title, Text, Skeleton, Button, 
  NavIdProps,
  Box,
  Counter
} from '@vkontakte/vkui';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { EventDetail, fetchEventById, fetchUserStatus, UserStatus } from '../../services/api';

const EventDetailPanel: FC<NavIdProps> = ({ id }) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null);

  useEffect(() => {
    fetchUserStatus().then(setUserStatus);
  }, []);

  useEffect(() => {
    if (params?.id) {
      fetchEventById(Number(params.id)).then((data) => {
        setEvent(data);
        setLoading(false);
      });
    }
  }, [params?.id]);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push('/')} />}>
        {event?.title}
      </PanelHeader>

      <Box style={{ maxWidth: 500, width: '100%', margin: '0 auto 0', padding: '0 15px' }}>
        {loading ? (
          <Skeleton style={{ height: 500, width: '100%', marginBottom: 16 }} />
        ) : (
          <Group style={{ padding: '15px' }}>
            <Title level="1" style={{ marginBottom: 8 }}>{event?.title}</Title>
            <img src={event?.image} alt="Event" style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />
            
            <Text style={{ marginBottom: 4 }}>Дата: <b>{event?.dateStart}</b></Text>
            <Text weight="2" style={{ marginBottom: 16 }}>Окончание регистрации: <b>{event?.regEnd}</b></Text>
            
            <Text style={{ marginBottom: 24, whiteSpace: 'pre-wrap' }}>{event?.description}</Text>

            <Button 
              size="l"
              stretched
              mode="primary"
              style={{ marginBottom: 8 }}
              onClick={() => routeNavigator.push(`/event/${params?.id}/register`)}
            >Регистрация</Button>
            <Button 
              size="l"
              stretched
              mode="secondary"
              onClick={() => routeNavigator.push(`/event/${params?.id}/requests`)}
              after={
                userStatus?.hasNewNotifications ? (
                  <Counter size="s">1</Counter>
                ) : null
              }
              >Мои заявки</Button>
          </Group>
        )}
      </Box>
    </Panel>
  );
};

export default EventDetailPanel;