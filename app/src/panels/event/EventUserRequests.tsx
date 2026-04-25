import { FC, useEffect, useState } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, 
  CardGrid, Card, Text, Title, Skeleton, 
  NavIdProps,
  Box
} from '@vkontakte/vkui';
import { fetchRequestsByEventId, ApplicationRequest, RequestStatus, RequestType } from '../../services/api';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

const getCardBackgroundColor = (status: RequestStatus, type: RequestType): string => {
  if (type === 'guest' || status === 'pending') {
    return 'var(--vkui--color_background_secondary)'; // Серый фон
  }
  if (status === 'approved') {
    return '#00b71e'; // Полупрозрачный зеленый
  }
  if (status === 'rejected') {
    return '#c26363'; // Полупрозрачный красный
  }
  return 'var(--vkui--color_background_secondary)';
};

const getTypeName = (type: RequestType): string => {
  return type === 'guest' ? 'Гость' : 'Участник';
};

export const EventUserRequestsPanel: FC<NavIdProps> = ({id}) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const [requests, setRequests] = useState<ApplicationRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.id) {
      fetchRequestsByEventId(Number(params.id)).then((data) => {
        setRequests(data);
        setLoading(false);
      });
    }
  }, [params?.id]);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.push(`/event/${params?.id}`)} />}>
        Мои заявки
      </PanelHeader>

      <Box style={{ maxWidth: 500, width: '100%', margin: '10px auto 0' }}>
        {loading ? (
          <CardGrid size="l">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <Skeleton style={{ maxWidth: 500, height: 88, width: '100%', borderRadius: 8 }} />
              </Card>
            ))}
          </CardGrid>
        ) : requests.length > 0 ? (
          <CardGrid size="l">
            {requests.map((req) => (
              <Card 
                key={req.id} 
                mode="outline"
                onClick={() => routeNavigator.push(`/event/${params?.id}/requests/${req.id}`)}
                style={{ 
                  backgroundColor: getCardBackgroundColor(req.status, req.type),
                  padding: 16,
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  color: req.status !== 'pending' && "#fff" || 'inherit'
                }}
              >
                <Title level="3" style={{ marginBottom: 8 }}>
                  {req.brand}
                </Title>
                <Text weight="2" style={{ marginBottom: 4 }}>
                  Госномер: {req.plate}
                </Text>
                <Text style={{ color: req.status !== 'pending' && "#fff" || 'var(--vkui--color_text_secondary)' }}>
                  Тип: {getTypeName(req.type)}
                </Text>
              </Card>
            ))}
          </CardGrid>
        ) : (
          <Text style={{ textAlign: 'center', marginTop: 20 }}>
            Заявок пока нет.
          </Text>
        )}
      </Box>
    </Panel>
  );
};