import { FC, useEffect, useState } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, 
  Group, SimpleCell, InfoRow, Skeleton, Header,
  Box,
  NavIdProps
} from '@vkontakte/vkui';
import { fetchRequestDetail, RequestDetail } from '../../services/api';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

export const RequestDetailPanel: FC<NavIdProps> = ({id}) => {
  const params = useParams<'requestId'>();
  const routeNavigator = useRouteNavigator();
  const [requestData, setRequestData] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params?.requestId) {
      fetchRequestDetail(Number(params.requestId)).then((data) => {
        setRequestData(data);
        setLoading(false);
      });
    }
  }, [params?.requestId]);

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Просмотр заявки
      </PanelHeader>

      <Box style={{ maxWidth: 500, margin: '0 auto 0', width: '100%' }}>
        {loading || !requestData ? (
          <Group>
            {Array.from({ length: 5 }).map((_, i) => (
              <SimpleCell key={i}>
                <Skeleton style={{ height: 40, width: '100%', borderRadius: 8 }} />
              </SimpleCell>
            ))}
          </Group>
        ) : (
          <Group>
            <SimpleCell multiline readOnly>
              <InfoRow header="Город">
                {requestData.city}
              </InfoRow>
            </SimpleCell>
            
            <SimpleCell multiline readOnly>
              <InfoRow header="ФИО">
                {requestData.fio}
              </InfoRow>
            </SimpleCell>

            <SimpleCell multiline readOnly>
              <InfoRow header="Телефон">
                {requestData.phone}
              </InfoRow>
            </SimpleCell>
            
            <SimpleCell multiline readOnly>
              <InfoRow header="Госномер">
                {requestData.plate}
              </InfoRow>
            </SimpleCell>
            
            <SimpleCell multiline readOnly>
              <InfoRow header="Марка авто">
                {requestData.brand}
              </InfoRow>
            </SimpleCell>
            
            <SimpleCell multiline readOnly>
              <InfoRow header="Количество человек в авто">
                {requestData.passengers}
              </InfoRow>
            </SimpleCell>

            {requestData.photos.length > 0 && (
              <>
                <Header>Фотографии авто</Header>
                <Box style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {requestData.photos.map((photo, index) => (
                    <div 
                      key={index} 
                      style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: 8, 
                        overflow: 'hidden',
                        backgroundColor: 'var(--vkui--color_background_secondary)'
                      }}
                    >
                      <img 
                        src={'/api'+photo} 
                        alt={`car_photo_${index}`} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                  ))}
                </Box>
              </>
            )}
          </Group>
        )}
      </Box>
    </Panel>
  );
};