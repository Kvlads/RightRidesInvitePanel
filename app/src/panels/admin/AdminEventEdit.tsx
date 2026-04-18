import { FC, useEffect, useState, ChangeEvent } from 'react';
import {
  Panel, PanelHeader, PanelHeaderBack, FormItem,
  Input, DateInput, Checkbox, File, Button, Group,
  FormLayoutGroup,
  NavIdProps,
  Box,
  Header,
  Textarea
} from '@vkontakte/vkui';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
import { AdminEventData, exportParticipants, fetchAdminEvent, saveEvent, sendBroadcastMessage } from '../../services/adminApi';

export const AdminEventEdit: FC<NavIdProps> = ({id}) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const isEdit = Boolean(params?.id);

  const [formData, setFormData] = useState<AdminEventData>({
    title: '',
    location: '',
    date: Date.now(),
    regEndDate: Date.now(),
    allowGuests: false,
    requireApproval: false,
    isActive: true,
  });

  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      fetchAdminEvent(Number(params?.id)).then((data) => {
        setFormData(data);
        setImagePreview(data.image);
      });
    }
  }, [isEdit, params?.id]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleDateChange = (name: 'date' | 'regEndDate') => (value?: Date) => {
    if (value) {
      setFormData((prev) => ({ ...prev, [name]: value.getTime() }));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
      setFormData((prev) => ({ ...prev, image: url }));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const success = await saveEvent(formData, isEdit ? Number(params?.id) : undefined);
    setLoading(false);
    if (success) {
      routeNavigator.back();
    }
  };

  const handleExport = async () => {
    if (params?.id) {
      await exportParticipants(Number(params.id));
    }
  };

  const handleSendMessage = async () => {
    if (params?.id && broadcastMessage.trim()) {
      setIsSending(true);
      const success = await sendBroadcastMessage(Number(params.id), broadcastMessage);
      if (success) {
        setBroadcastMessage('');
      }
      setIsSending(false);
    }
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={() => routeNavigator.back()} />}>
        {isEdit ? 'Редактирование' : 'Создание'}
      </PanelHeader>

      <Box style={{ maxWidth: 500, width: '100%', margin: '0 auto', padding: 0 }}>
        <Group>
          <FormLayoutGroup>
            <FormItem>
              <Checkbox
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
              >
                Мероприятие активно
              </Checkbox>
            </FormItem>

            <FormItem top="Название мероприятия">
              <Input
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Введите название"
              />
            </FormItem>

            <FormItem top="Место проведения">
              <Input
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="Введите адрес"
              />
            </FormItem>

            <FormItem top="Дата проведения">
              <DateInput
                value={new Date(formData.date)}
                onChange={handleDateChange('date')}
                enableTime={true}
              />
            </FormItem>

            <FormItem top="Дата окончания регистрации">
              <DateInput
                value={new Date(formData.regEndDate)}
                onChange={handleDateChange('regEndDate')}
                enableTime={true}
              />
            </FormItem>

            <FormItem>
              <Checkbox
                name="allowGuests"
                checked={formData.allowGuests}
                onChange={handleInputChange}
              >
                Регистрация гостей
              </Checkbox>
              <Checkbox
                name="requireApproval"
                checked={formData.requireApproval}
                onChange={handleInputChange}
              >
                Одобрение участников
              </Checkbox>
            </FormItem>

            <FormItem top="Изображение анонса">
              <File
                mode="secondary"
                accept="image/*"
                onChange={handleFileChange}
              >
                {imagePreview ? 'Изменить фото' : 'Загрузить фото'}
              </File>
              {imagePreview && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: '100%', borderRadius: 8, maxHeight: 200, objectFit: 'cover' }}
                  />
                </div>
              )}
            </FormItem>

            <FormItem>
              <Button size="l" stretched onClick={handleSave} loading={loading}>
                Сохранить
              </Button>
              <Button
                size="l"
                stretched
                mode="secondary"
                onClick={() => routeNavigator.back()}
                style={{ marginTop: 8 }}
              >
                Отменить
              </Button>
            </FormItem>
          </FormLayoutGroup>
        </Group>

        {isEdit && (
          <Group header={<Header>Управление участниками</Header>}>
            <Box>
              <Button 
                size="l" 
                stretched 
                mode="secondary" 
                onClick={handleExport}
              >
                Экспорт участников
              </Button>

              <div style={{ height: 20 }} />

              <FormItem top="Сообщение участникам" style={{ padding: 0 }}>
                <Textarea
                  placeholder="Введите текст сообщения для рассылки"
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                />
              </FormItem>

              <Button 
                size="l" 
                stretched 
                mode="primary" 
                loading={isSending}
                disabled={!broadcastMessage.trim()}
                onClick={handleSendMessage}
                style={{ marginTop: 12 }}
              >
                Отправить сообщение участникам
              </Button>
            </Box>
          </Group>
        )}
      </Box>
    </Panel>
  );
};