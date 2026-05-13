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
import { uploadPhoto } from '../../services/api';

export const AdminEventEdit: FC<NavIdProps> = ({id}) => {
  const params = useParams<'id'>();
  const routeNavigator = useRouteNavigator();
  const isEdit = Boolean(params?.id);

  const [formData, setFormData] = useState<AdminEventData>({
    title: '',
    location: '',
    description: '',
    date: Date.now(),
    regEndDate: Date.now(),
    allowGuests: false,
    requireApproval: false,
    isActive: true,
    registerOpen: true,
    approvalText: '',
    rejectionText: '',
    customRegister: null,
  });

  const [broadcastMessage, setBroadcastMessage] = useState('');
  // const [isSending, setIsSending] = useState(false);

  const [imagePreview, setImagePreview] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [useExternalLink, setUseExternalLink] = useState(!!formData.customRegister);

  useEffect(() => {
    if (isEdit) {
      fetchAdminEvent(Number(params?.id)).then((data) => {
        setFormData((prev) => ({
          ...prev,
          ...data,
          // Защита от undefined, если в старых мероприятиях этих полей еще нет
          approvalText: data.approvalText || '',
          rejectionText: data.rejectionText || '',
        }));
        setImagePreview(data.image);
        setUseExternalLink(!!data.customRegister)
      });
    }
  }, [isEdit, params?.id]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    
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

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploadingImage(true);
        const tempUrl = URL.createObjectURL(file);
        setImagePreview(tempUrl);

        const serverUrl = await uploadPhoto(file);
        
        setImagePreview(serverUrl);
        setFormData((prev) => ({ ...prev, image: serverUrl }));

      } catch (error) {
        console.error('Ошибка при загрузке изображения обложки:', error);
        setImagePreview(formData.image);
      } finally {
        setIsUploadingImage(false);
        e.target.value = ''; 
      }
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

  const handleExport = async (type: 'guest' | 'participant') => {
    if (params?.id) {
      await exportParticipants(Number(params.id), type);
    }
  };

  // const handleSendMessage = async () => {
  //   if (params?.id && broadcastMessage.trim()) {
  //     setIsSending(true);
  //     const success = await sendBroadcastMessage(Number(params.id), broadcastMessage);
  //     if (success) {
  //       setBroadcastMessage('');
  //     }
  //     setIsSending(false);
  //   }
  // };

  const getImageUrl = (url: string) => {
    if (url.startsWith('/')) {
      return '/api' + url;
    }
    if (url.startsWith('blob:')) return url;
    return url;
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
              <Checkbox
                name="registerOpen"
                checked={formData.registerOpen}
                onChange={handleInputChange}
              >
                Регистрация открыта
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
                checked={useExternalLink} 
                onChange={(e) => {
                  const checked = e.target.checked;
                  setUseExternalLink(checked);
                  if (!checked) setFormData(prev => ({ ...prev, customRegister: null }));
                }}
              >
                Регистрация вне приложения
              </Checkbox>
            </FormItem>

            {useExternalLink && (
              <FormItem 
                top="Ссылка на внешнюю регистрацию" 
                status={formData.customRegister ? 'default' : 'error'}
                bottom={formData.customRegister ? "" : "Введите корректный URL"}
              >
                <Input 
                  type="url"
                  placeholder="https://example.com/register"
                  value={formData.customRegister || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, customRegister: e.target.value }))}
                />
              </FormItem>
            )}

            <FormItem top="Описание">
              <Textarea 
                name="description" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Введите описание мероприятия..." 
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

            {/* НОВЫЕ ПОЛЯ ДЛЯ ТЕКСТОВ */}
            <FormItem top="Текст приёма участника">
              <Textarea 
                name="approvalText" 
                value={formData.approvalText} 
                onChange={handleInputChange} 
                placeholder="Например: 🎉 Ваша заявка принята! Ждем вас на мероприятии." 
              />
            </FormItem>

            <FormItem top="Текст отказа участнику">
              <Textarea 
                name="rejectionText" 
                value={formData.rejectionText} 
                onChange={handleInputChange} 
                placeholder="Например: 😔 К сожалению, ваша заявка была отклонена." 
              />
            </FormItem>

            <FormItem top="Изображение анонса">
              <File
                mode="secondary"
                accept="image/*"
                onChange={handleFileChange}
                loading={isUploadingImage}
              >
                {imagePreview ? 'Изменить фото' : 'Загрузить фото'}
              </File>
              {imagePreview && (
                <div style={{ marginTop: 10 }}>
                  <img
                    src={getImageUrl(imagePreview)}
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
                onClick={() => handleExport('participant')}
              >
                Экспорт участников
              </Button>

              <div style={{ height: 10 }} />

              <Button 
                size="l" 
                stretched 
                mode="secondary" 
                onClick={() => handleExport('guest')}
              >
                Экспорт гостей
              </Button>

              {/* <div style={{ height: 20 }} />

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
              </Button> */}
            </Box>
          </Group>
        )}
      </Box>
    </Panel>
  );
};