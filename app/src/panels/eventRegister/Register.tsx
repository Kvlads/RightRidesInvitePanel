import { FC, useState, ChangeEvent } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, FormItem, 
  Input, File, Button, Box, Spinner,
  NavIdProps,
  Group
} from '@vkontakte/vkui';
import { submitRegistration, uploadPhotoMock, RegistrationData } from '../../services/api';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

interface PhotoState {
  id: string;
  url: string;
  isLoading: boolean;
}

const initialFormState: RegistrationData = {
  city: '',
  fio: '',
  plate: '',
  brand: '',
  passengers: ''
};

export const RegisterPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  const [formData, setFormData] = useState<RegistrationData>(initialFormState);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    // Ограничение до 5 фото в сумме
    const filesArray = Array.from(e.target.files).slice(0, 5 - photos.length);

    filesArray.forEach((file) => {
      const id = Math.random().toString(36).substring(7);
      const tempUrl = URL.createObjectURL(file);

      // Добавляем плитку в состоянии загрузки
      setPhotos((prev) => [...prev, { id, url: tempUrl, isLoading: true }]);

      // Отправляем файл и снимаем статус загрузки
      uploadPhotoMock(file).then(() => {
        setPhotos((prev) => 
          prev.map((photo) => 
            photo.id === id ? { ...photo, isLoading: false } : photo
          )
        );
      });
    });
    
    // Очищаем input для возможности повторной загрузки тех же файлов
    e.target.value = '';
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitRegistration(formData);
    
    setIsSubmitting(false);
    setFormData(initialFormState);
    setPhotos([]);

    // В реальном приложении здесь вызывается диспетчер глобального стора 
    // для передачи Snackbar в компонент View перед навигацией.
    // Пример: showGlobalToast('Ваша заявка отправлена! Ожидайте ответа');
    
    routeNavigator.push('/event-success');
  };

  const handleCancel = () => {
    setFormData(initialFormState);
    setPhotos([]);
    routeNavigator.push(`/event/${params?.id}`);
  };

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={handleCancel} />}>
        Регистрация
      </PanelHeader>

      <Box style={{ maxWidth: 500, margin: '0 auto 0', padding: '0 15px', width: '100%' }}>
        <Group style={{ padding: 0 }}>
          <FormItem top="Город">
            <Input name="city" value={formData.city} onChange={handleInputChange} />
          </FormItem>
          
          <FormItem top="ФИО">
            <Input name="fio" value={formData.fio} onChange={handleInputChange} />
          </FormItem>
          
          <FormItem top="Госномер (только цифры)">
            <Input 
              type="number" 
              name="plate" 
              value={formData.plate} 
              onChange={handleInputChange} 
            />
          </FormItem>
          
          <FormItem top="Марка авто">
            <Input name="brand" value={formData.brand} onChange={handleInputChange} />
          </FormItem>
          
          <FormItem top="Количество человек в авто">
            <Input 
              type="number" 
              name="passengers" 
              value={formData.passengers} 
              onChange={handleInputChange} 
            />
          </FormItem>

          <FormItem top="Фотографии авто (от 1 до 5)">
            {photos.length < 5 && (
              <File 
                multiple 
                accept="image/*" 
                mode="secondary" 
                onChange={handlePhotoUpload}
              >
                Добавить фото
              </File>
            )}
            
            {photos.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {photos.map((photo) => (
                  <div 
                    key={photo.id} 
                    style={{ 
                      position: 'relative', 
                      width: 80, 
                      height: 80, 
                      borderRadius: 8, 
                      overflow: 'hidden',
                      backgroundColor: 'var(--vkui--color_background_secondary)'
                    }}
                  >
                    <img 
                      src={photo.url} 
                      alt="preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    {photo.isLoading && (
                      <div style={{ 
                        position: 'absolute', 
                        inset: 0, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        backgroundColor: 'rgba(0,0,0,0.5)' 
                      }}>
                        <Spinner size="s" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </FormItem>

          <FormItem>
            <Button 
              size="l" 
              stretched 
              mode="primary" 
              loading={isSubmitting} 
              onClick={handleSubmit}
              style={{ marginBottom: 8 }}
            >
              Отправить
            </Button>
            <Button 
              size="l" 
              stretched 
              mode="secondary" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Отменить
            </Button>
          </FormItem>
        </Group>
      </Box>
    </Panel>
  );
};