import { FC, useEffect, useState, ReactNode, useMemo } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, 
  Button, Text, Spinner, NavIdProps,
  Card, Title, HorizontalScroll, Div, ButtonGroup,
  MiniInfoCell, Snackbar, Header
} from '@vkontakte/vkui';
import { Icon20UserOutline, Icon20MailOutline, Icon20ArticleOutline, Icon20InfoCircleOutline, Icon16ErrorCircleFill, Icon16Done } from '@vkontakte/icons';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { fetchRequests, RequestData, submitVote } from '../../services/adminApi';
import { io, Socket } from 'socket.io-client';

const STATUS_MAP: Record<string, { label: string, color: string }> = {
  pending: { label: '⏳ На рассмотрении', color: 'var(--vkui--color_text_secondary)' },
  approved: { label: '✅ Принята', color: 'var(--vkui--color_text_positive)' },
  rejected: { label: '❌ Отклонена', color: 'var(--vkui--color_text_negative)' }
};

export const AdminEventRequests: FC<NavIdProps> = ({ id }) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<number | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  const showSnackbar = (text: string, type: 'success' | 'error') => {
    setSnackbar(
      <Snackbar
        onClose={() => setSnackbar(null)}
        before={type === 'error' ? <Icon16ErrorCircleFill fill="var(--vkui--color_icon_negative)" /> : <Icon16Done fill="var(--vkui--color_icon_positive)" />}
      >
        {text}
      </Snackbar>
    );
  };

  const loadData = async () => {
    if (!params?.id) return;
    try {
      setLoading(true);
      const data = await fetchRequests(Number(params.id));
      setRequests(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    return { total, approved, rejected, pending };
  }, [requests]);

  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.id - a.id; 
    });
  }, [requests]);

  useEffect(() => {
    loadData();

    let socket: Socket;
    if (params?.id) {
      const socketUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin;

      socket = io(socketUrl, { 
        path: '/socket.io',
        transports: ['websocket', 'polling']
      }); 

      socket.on('connect', () => {
        socket.emit('join_event', params.id);
      });

      socket.on('vote_updated', (data: { participantId: number, newStatus: string, updatedParticipant: RequestData }) => {
        if (!data.updatedParticipant) return;

        setRequests((prevRequests) => 
          prevRequests.map((req) => 
            req.id === data.participantId 
              ? { ...req, ...data.updatedParticipant } 
              : req
          )
        );

        setSelectedRequest((current) => {
          if (current && current.id === data.participantId) {
            return { ...current, ...data.updatedParticipant };
          }
          return current;
        });
      });

      socket.on('new_request', (data: { newParticipant: RequestData }) => {
        if (!data.newParticipant) return;
        
        setRequests((prevRequests) => {
          if (prevRequests.some(r => r.id === data.newParticipant.id)) return prevRequests;
          return [data.newParticipant, ...prevRequests];
        });
        
        showSnackbar(`📥 Поступила новая заявка от ${data.newParticipant.fio || 'участника'}!`, 'success');
      });
    }

    return () => {
      if (socket) socket.disconnect();
    };
  }, [params?.id]);

  const handleVote = async (e: React.MouseEvent, requestId: number, decision: 'yes' | 'no') => {
    e.stopPropagation(); 
    try {
      setVotingId(requestId);
      
      // 1. Отправляем голос (apiClient сделает всю грязную работу)
      await submitVote(requestId, decision);
      
      // 2. Запрашиваем свежие данные для интерфейса
      const freshData = await fetchRequests(Number(params?.id));
      setRequests(freshData);
      
      // 3. Обновляем модалку, если она открыта
      if (selectedRequest) {
        const updatedSelected = freshData.find(r => r.id === selectedRequest.id);
        if (updatedSelected) setSelectedRequest(updatedSelected);
      }
      
    } catch (error: any) {
      console.error('Ошибка голосования:', error);
      // Если это ошибка 401, apiClient уже кинул нас на страницу логина, 
      // но если это другая ошибка (например, "Голосование закрыто"), покажем Snackbar
      if (error.message !== 'Сессия истекла. Пожалуйста, авторизуйтесь заново.') {
        showSnackbar(error.message || 'Сетевая ошибка', 'error');
      }
    } finally {
      setVotingId(null);
    }
  };

  const getImageUrl = (url: string) => {
    return url.startsWith('/') ? `/api${url}` : url;
  };

  if (loading) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>Голосование</PanelHeader>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 100 }}>
          <Spinner size="l" />
        </div>
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        Голосование
      </PanelHeader>

      <Div style={{ width: '90%', maxWidth: 600, margin: '0 auto', paddingBottom: 40 }}>
        
        <Card mode="tint" style={{ marginBottom: 24, padding: '12px 16px', backgroundColor: 'var(--vkui--color_background_secondary)' }}>
          <Header size="s" style={{ padding: 0, marginBottom: 8 }}>Статистика участников</Header>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Text>Всего заявок: <b style={{ fontSize: 16 }}>{stats.total}</b></Text>
            <Text style={{ color: 'var(--vkui--color_text_secondary)' }}>Ожидают: <b>{stats.pending}</b></Text>
            <Text style={{ color: 'var(--vkui--color_text_positive)' }}>Одобрено: <b>{stats.approved}</b></Text>
            <Text style={{ color: 'var(--vkui--color_text_negative)' }}>Отклонено: <b>{stats.rejected}</b></Text>
          </div>
        </Card>

        <Header style={{ paddingLeft: 0 }}>Список анкет</Header>

        {sortedRequests.length === 0 ? (
          <Text style={{ textAlign: 'center', marginTop: 20, color: 'var(--vkui--color_text_secondary)' }}>
            Заявок пока нет.
          </Text>
        ) : (
          sortedRequests.map((req) => {
            const yesVotes = req.votes.filter(v => v.decision === 'yes');
            const noVotes = req.votes.filter(v => v.decision === 'no');
            const statusInfo = STATUS_MAP[req.status] || { label: req.status, color: 'black' };

            return (
              <Card 
                key={req.id} 
                mode="shadow" 
                style={{ 
                  marginBottom: 20, 
                  padding: 16, 
                  cursor: 'pointer',
                  opacity: req.status !== 'pending' ? 0.75 : 1, 
                }}
                onClick={() => setSelectedRequest(req)}
              >
                <Title level="2" style={{ marginBottom: 8 }}>{req.brand} • {req.plate}</Title>
                <Text style={{ marginBottom: 4 }}><b>Владелец:</b> {req.fio}</Text>

                {req.photos.length > 0 && (
                  <HorizontalScroll style={{ marginBottom: 16, marginTop: 16, width: '100%' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {req.photos.map(photo => (
                        <img 
                          key={photo.id}
                          src={getImageUrl(photo.url)} 
                          alt="Car" 
                          style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }}
                        />
                      ))}
                    </div>
                  </HorizontalScroll>
                )}

                {/* ОБНОВЛЕННЫЙ БЛОК С ИМЕНАМИ */}
                <div style={{ display: 'flex', gap: 24, marginBottom: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  
                  {/* Колонка "ЗА" */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                    <Text style={{ color: 'var(--vkui--color_text_positive)', fontWeight: 'bold' }}>
                      ЗА: {yesVotes.length}
                    </Text>
                    {yesVotes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {yesVotes.map(v => (
                          <Text key={v.id} style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                            • {v.name}
                          </Text>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Колонка "ПРОТИВ" */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 100 }}>
                    <Text style={{ color: 'var(--vkui--color_text_negative)', fontWeight: 'bold' }}>
                      ПРОТИВ: {noVotes.length}
                    </Text>
                    {noVotes.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {noVotes.map(v => (
                          <Text key={v.id} style={{ color: 'var(--vkui--color_text_secondary)', fontSize: 13 }}>
                            • {v.name}
                          </Text>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Статус справа */}
                  <Text style={{ color: statusInfo.color, fontWeight: 'bold', marginLeft: 'auto' }}>
                    {statusInfo.label}
                  </Text>
                </div>

                {req.status === 'pending' && (
                  <ButtonGroup stretched>
                    <Button 
                      mode="primary" size="l" stretched 
                      style={{ backgroundColor: 'var(--vkui--color_background_positive)' }}
                      loading={votingId === req.id}
                      onClick={(e) => handleVote(e, req.id, 'yes')}
                    >
                      За
                    </Button>
                    <Button 
                      mode="primary" size="l" stretched 
                      style={{ backgroundColor: 'var(--vkui--color_background_negative)' }}
                      loading={votingId === req.id}
                      onClick={(e) => handleVote(e, req.id, 'no')}
                    >
                      Против
                    </Button>
                  </ButtonGroup>
                )}
              </Card>
            );
          })
        )}
      </Div>

      {selectedRequest && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 1000,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: 20
          }} 
          onClick={() => setSelectedRequest(null)}
        >
          <Card 
            mode="shadow"
            style={{ 
              width: '100%', maxWidth: 500, maxHeight: '90vh', 
              overflowY: 'auto', padding: 24, borderRadius: 16 
            }} 
            onClick={e => e.stopPropagation()}
          >
            <Title level="1" style={{ marginBottom: 20, textAlign: 'center' }}>
              {selectedRequest.brand}
            </Title>
            
            <MiniInfoCell before={<Icon20UserOutline />}>{selectedRequest.fio}</MiniInfoCell>
            <MiniInfoCell before={<Icon20MailOutline />}>{selectedRequest.email || 'Нет email'}</MiniInfoCell>
            <MiniInfoCell before={<Icon20ArticleOutline />}>Госномер: {selectedRequest.plate}</MiniInfoCell>
            <MiniInfoCell before={<Icon20InfoCircleOutline />}>Пассажиры: {selectedRequest.passengers}</MiniInfoCell>
            
            <div style={{ marginTop: 12, padding: '0 12px' }}>
              <Text weight="2" style={{ color: (STATUS_MAP[selectedRequest.status] || {color: 'black'}).color }}>
                Статус заявки: <b>{(STATUS_MAP[selectedRequest.status] || {label: selectedRequest.status}).label}</b>
              </Text>
            </div>

            {selectedRequest.comment && (
              <Div style={{ backgroundColor: 'var(--vkui--color_background_secondary)', borderRadius: 8, marginTop: 12 }}>
                <Text><b>Комментарий:</b><br/>{selectedRequest.comment}</Text>
              </Div>
            )}

            <Title level="3" style={{ marginTop: 24, marginBottom: 12 }}>Фотографии:</Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {selectedRequest.photos.map(photo => (
                <img 
                  key={photo.id}
                  src={getImageUrl(photo.url)} 
                  alt="Car" 
                  style={{ width: '100%', height: 'auto', borderRadius: 8, objectFit: 'contain' }}
                />
              ))}
            </div>

            <Button 
              size="l" stretched mode="secondary" 
              style={{ marginTop: 24 }}
              onClick={() => setSelectedRequest(null)}
            >
              Закрыть
            </Button>
          </Card>
        </div>
      )}

      {snackbar}
    </Panel>
  );
};