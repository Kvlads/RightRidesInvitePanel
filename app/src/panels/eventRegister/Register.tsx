import { FC, useState, ChangeEvent, ReactNode, useEffect } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, FormItem, 
  Input, File, Button, Box, Spinner,
  NavIdProps, Group, SegmentedControl, Snackbar,
  PanelSpinner
} from '@vkontakte/vkui';
import { Icon16ErrorCircleFill, Icon16Done } from '@vkontakte/icons';
import { submitRegistration, RegistrationData, uploadPhoto, fetchEventById, EventDetail } from '../../services/api';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';

interface PhotoState {
  id: string;
  previewUrl: string;
  realUrl?: string;
  isLoading: boolean;
}

const initialFormState: RegistrationData = {
  city: '',
  fio: '',
  plate: '',
  brand: '',
  passengers: '',
  type: 'participant',
};

export const RegisterPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  
  // Состояния для мероприятия
  const [eventData, setEventData] = useState<EventDetail | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  const [isParticipant, setIsParticipant] = useState(true);
  const [formData, setFormData] = useState<RegistrationData>(initialFormState);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationData | 'photos', string>>>({});
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  // Загружаем данные о мероприятии при открытии формы
  useEffect(() => {
    const loadEvent = async () => {
      if (!params?.id) return;
      try {
        const data = await fetchEventById(parseInt(params.id));
        setEventData(data);
        // Если мероприятие не допускает гостей, жестко ставим роль "Участник"
        if (!data.allowGuests) {
          setIsParticipant(true);
        }
      } catch (error) {
        showSnackbar('Не удалось загрузить данные мероприятия', 'error');
      } finally {
        setIsLoadingEvent(false);
      }
    };
    loadEvent();
  }, [params?.id]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.currentTarget;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof RegistrationData]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setErrors((prev) => ({ ...prev, photos: undefined }));

    const filesArray = Array.from(e.target.files).slice(0, 5 - photos.length);

    filesArray.forEach((file) => {
      const photoId = Math.random().toString(36).substring(7);
      const tempUrl = URL.createObjectURL(file);

      setPhotos((prev) => [...prev, { id: photoId, previewUrl: tempUrl, isLoading: true }]);

      uploadPhoto(file)
        .then((uploadedUrl) => {
          setPhotos((prev) => 
            prev.map((photo) => 
              photo.id === photoId ? { ...photo, isLoading: false, realUrl: uploadedUrl } : photo
            )
          );
        })
        .catch(() => {
          setPhotos((prev) => prev.filter((p) => p.id !== photoId));
          showSnackbar('Ошибка загрузки фото', 'error');
        });
    });
    
    e.target.value = '';
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RegistrationData | 'photos', string>> = {};

    if (!formData.fio.trim()) newErrors.fio = 'Обязательное поле';
    if (!formData.city.trim()) newErrors.city = 'Обязательное поле';
    
    // Автомобильные данные нужны ОБЕИМ ролям
    if (!formData.brand.trim()) newErrors.brand = 'Укажите марку авто';
    if (!formData.plate.trim()) newErrors.plate = 'Укажите госномер';
    if (!formData.passengers.trim()) newErrors.passengers = 'Укажите количество пассажиров (или 0)';
    
    // Фотографии требуются ТОЛЬКО участникам
    if (isParticipant) {
      if (photos.length === 0) {
        newErrors.photos = 'Необходимо добавить хотя бы 1 фото автомобиля';
      } else if (photos.some((p) => p.isLoading)) {
        newErrors.photos = 'Дождитесь окончания загрузки всех фото';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const handleSubmit = async () => {
    if (!params?.id || isNaN(parseInt(params.id))) return;

    if (!validateForm()) {
      showSnackbar('Пожалуйста, заполните все обязательные поля', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload: RegistrationData = {
      fio: formData.fio,
      city: formData.city,
      plate: formData.plate,
      brand: formData.brand,
      passengers: formData.passengers,
      type: isParticipant ? 'participant' : 'guest',
      // Отправляем фото только если юзер регистрируется как участник
      photos: isParticipant ? (photos.map((p) => p.realUrl).filter(Boolean) as string[]) : [],
    };

    try {
      await submitRegistration(parseInt(params.id), payload);
      showSnackbar('Заявка успешно отправлена!', 'success');
      
      setTimeout(() => {
        routeNavigator.push('/event-success');
      }, 1000);
      
    } catch (error: any) {
      showSnackbar(error.message || 'Ошибка отправки заявки', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    routeNavigator.push(`/event/${params?.id}`);
  };

  if (isLoadingEvent) {
    return (
      <Panel id={id}>
        <PanelHeader before={<PanelHeaderBack onClick={handleCancel} />}>Регистрация</PanelHeader>
        <PanelSpinner size="l" style={{ marginTop: 100 }} />
      </Panel>
    );
  }

  return (
    <Panel id={id}>
      <PanelHeader before={<PanelHeaderBack onClick={handleCancel} />}>
        Регистрация
      </PanelHeader>

      <Box style={{ maxWidth: 500, margin: '0 auto', padding: '16px 15px 32px', width: '100%' }}>
        
        {/* Показываем селектор ТОЛЬКО если мероприятие допускает гостей */}
        {eventData?.allowGuests && (
          <SegmentedControl
            size="l"
            name="role"
            value={isParticipant ? 'participant' : 'guest'}
            onChange={(val) => {
              setIsParticipant(val === 'participant');
              setErrors({}); // Сбрасываем ошибки при смене типа
            }}
            options={[
              { label: 'Участник', value: 'participant' },
              { label: 'Гость', value: 'guest' }
            ]}
            style={{ marginBottom: 16 }}
          />
        )}

        <Group style={{ padding: 0 }}>
          <FormItem top="ФИО" status={errors.fio ? 'error' : 'default'} bottom={errors.fio}>
            <Input name="fio" value={formData.fio} onChange={handleInputChange} placeholder="Иванов Иван" />
          </FormItem>
          
          <FormItem top="Город" status={errors.city ? 'error' : 'default'} bottom={errors.city}>
            <Input name="city" value={formData.city} onChange={handleInputChange} placeholder="Москва" />
          </FormItem>
          
          <FormItem top="Марка авто" status={errors.brand ? 'error' : 'default'} bottom={errors.brand}>
            <Input name="brand" value={formData.brand} onChange={handleInputChange} placeholder="Toyota Supra" />
          </FormItem>

          <FormItem top="Госномер" status={errors.plate ? 'error' : 'default'} bottom={errors.plate}>
            <Input name="plate" value={formData.plate} onChange={handleInputChange} placeholder="А111АА77" />
          </FormItem>
          
          <FormItem top="Количество пассажиров с вами" status={errors.passengers ? 'error' : 'default'} bottom={errors.passengers}>
            <Input type="number" name="passengers" value={formData.passengers} onChange={handleInputChange} placeholder="0" />
          </FormItem>

          {/* Блок фотографий показываем ТОЛЬКО участнику */}
          {isParticipant && (
            <FormItem 
              top="Фотографии авто (от 1 до 5)" 
              status={errors.photos ? 'error' : 'default'} 
              bottom={errors.photos}
            >
              {photos.length < 5 && (
                <File multiple accept="image/*" mode="secondary" onChange={handlePhotoUpload}>
                  Выбрать фото
                </File>
              )}
              
              {photos.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                  {photos.map((photo) => (
                    <div 
                      key={photo.id} 
                      style={{ 
                        position: 'relative', width: 80, height: 80, 
                        borderRadius: 8, overflow: 'hidden',
                        backgroundColor: 'var(--vkui--color_background_secondary)'
                      }}
                    >
                      <img src={photo.previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {photo.isLoading && (
                        <div style={{ 
                          position: 'absolute', inset: 0, display: 'flex', 
                          alignItems: 'center', justifyContent: 'center', 
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
          )}

          <FormItem>
            <Button 
              size="l" stretched mode="primary" 
              loading={isSubmitting} onClick={handleSubmit}
              style={{ marginBottom: 8, marginTop: 16 }}
            >
              Отправить заявку
            </Button>
            <Button 
              size="l" stretched mode="secondary" 
              onClick={handleCancel} disabled={isSubmitting}
            >
              Отменить
            </Button>
          </FormItem>
        </Group>
      </Box>
      {snackbar}
    </Panel>
  );
};