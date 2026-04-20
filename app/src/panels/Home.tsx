import { FC, useEffect, useState } from 'react';
import {
  Panel,
  PanelHeader,
  Header,
  Button,
  NavIdProps,
  Text,
  Skeleton,
  Box,
} from '@vkontakte/vkui';
import { UserInfo } from '@vkontakte/vk-bridge';
import { useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { EventData, fetchEvents } from '../services/api';
import { useAuth } from '../providers/AuthProvider';

export interface HomeProps extends NavIdProps {
  fetchedUser?: UserInfo;
}

// export const Home: FC<HomeProps> = ({ id, fetchedUser }) => {
export const Home: FC<HomeProps> = () => {
  // const { photo_200, city, first_name, last_name } = { ...fetchedUser };
  const routeNavigator = useRouteNavigator();
  const { isAdmin } = useAuth();

  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents().then((data) => {
      setEvents(data);
      setLoading(false);
    });
  }, []);

  return (
    <Panel id="home">
      <PanelHeader>
        {isAdmin && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 10 }}>
            <Button 
              mode="secondary"
              style={{ backgroundColor: 'black', color: 'white' }}
              onClick={() => routeNavigator.push('/admin')}
            >
              Администрирование
            </Button>
          </div>
        )}

        {!isAdmin && "RightRides. [less clearance - more respect]"}
      </PanelHeader>

      <Box style={{ maxWidth: 400, margin: '15px auto 0', padding: '0 15px' }}>
        <Header size='s'>Наши мероприятия</Header>
        
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} style={{ marginBottom: 10, height: 44, borderRadius: 8 }} />
          ))
        ) : events.length > 0 ? (
          events.map((event) => (
            <Button 
              key={event.id} 
              size="l" 
              stretched 
              mode="secondary" 
              align="left"
              style={{ marginBottom: 10 }}
              onClick={() => routeNavigator.push(`event/${event.id}`, {})}
            >
              <img src={'/api'+event?.image} alt="Event" style={{ width: '100%', borderRadius: 8, marginBottom: 10, marginTop: 15, }} />
              <Box style={{ marginBottom: 10 }}>{event.date}. {event.title}</Box>
            </Button>
          ))
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            К сожалению запланированных мероприятий нет
          </Text>
        )}
      </Box>
    </Panel>
  );
};
