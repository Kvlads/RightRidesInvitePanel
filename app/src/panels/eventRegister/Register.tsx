import { FC, useState, ChangeEvent, ReactNode, useEffect } from 'react';
import { 
  Panel, PanelHeader, PanelHeaderBack, FormItem, 
  Input, File, Button, Box, Spinner,
  NavIdProps, Group, SegmentedControl, Snackbar,
  PanelSpinner, Placeholder, Textarea, Checkbox
} from '@vkontakte/vkui';
import { Icon16ErrorCircleFill, Icon16Done, Icon56UsersOutline } from '@vkontakte/icons';
import { submitRegistration, RegistrationData, uploadPhoto, fetchEventById, EventDetail } from '../../services/api';
import { useParams, useRouteNavigator } from '@vkontakte/vk-mini-apps-router';
// Импортируем компонент Яндекс Капчи
import { SmartCaptcha } from '@yandex/smart-captcha';

interface PhotoState {
  id: string;
  previewUrl: string;
  realUrl?: string;
  isLoading: boolean;
}

const initialFormState: RegistrationData = {
  email: '',
  city: '',
  fio: '',
  plate: '',
  brand: '',
  passengers: '',
  comment: '', // Поле для комментария
  type: 'participant',
};

export const RegisterPanel: FC<NavIdProps> = ({id}) => {
  const routeNavigator = useRouteNavigator();
  const params = useParams<'id'>();
  
  const [eventData, setEventData] = useState<EventDetail | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(true);

  const [isParticipant, setIsParticipant] = useState(true);
  const [hasSelectedRole, setHasSelectedRole] = useState(false);

  // Состояние для галочки обработки ПД
  const [isAgreed, setIsAgreed] = useState(false);

  const [formData, setFormData] = useState<RegistrationData>(initialFormState);
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  
  // Состояние для токена Яндекс Капчи
  const [captchaToken, setCaptchaToken] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RegistrationData | 'photos', string>>>({});
  const [snackbar, setSnackbar] = useState<ReactNode | null>(null);

  useEffect(() => {
    const loadEvent = async () => {
      if (!params?.id) return;
      try {
        const data = await fetchEventById(parseInt(params.id));
        setEventData(data);
        
        if (!data.allowGuests) {
          setIsParticipant(true);
          setHasSelectedRole(true);
        }
      } catch (error) {
        showSnackbar('Не удалось загрузить данные мероприятия', 'error');
      } finally {
        setIsLoadingEvent(false);
      }
    };
    loadEvent();
  }, [params?.id]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; 

    if (!formData.fio.trim()) newErrors.fio = 'Обязательное поле';
    if (!formData.city.trim()) newErrors.city = 'Обязательное поле';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Обязательное поле';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Введите корректный email адрес';
    }
    
    if (!formData.brand.trim()) newErrors.brand = 'Укажите марку авто';
    if (!formData.plate.trim()) newErrors.plate = 'Укажите госномер';
    if (!formData.passengers.trim()) newErrors.passengers = 'Укажите количество пассажиров (или 0)';
    
    if (isParticipant) {
      if (!formData.comment?.trim() || formData.comment.trim().length < 10) {
        newErrors.comment = 'Комментарий должен содержать минимум 10 символов';
      }

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
      showSnackbar('Пожалуйста, исправьте ошибки в форме', 'error');
      return;
    }

    if (!captchaToken) {
      showSnackbar('Пожалуйста, пройдите проверку на робота', 'error');
      return;
    }

    setIsSubmitting(true);

    const payload: RegistrationData = {
      email: formData.email.trim(),
      fio: formData.fio,
      city: formData.city,
      plate: formData.plate,
      brand: formData.brand,
      passengers: formData.passengers,
      comment: isParticipant ? formData.comment?.trim() : '', 
      type: isParticipant ? 'participant' : 'guest',
      photos: isParticipant ? (photos.map((p) => p.realUrl).filter(Boolean) as string[]) : [],
      captchaToken, 
    };

    try {
      await submitRegistration(parseInt(params.id), payload);
      showSnackbar('Заявка успешно отправлена!', 'success');
      
      setTimeout(() => {
        routeNavigator.push('/event-success');
      }, 1000);
      
    } catch (error: any) {
      showSnackbar(error.message || 'Ошибка отправки заявки', 'error');
      setIsSubmitting(false);
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

      <Box style={{ maxWidth: 500, margin: '0 auto', padding: '16px 0 32px', width: '100%' }}>
        
        {!hasSelectedRole && eventData?.allowGuests ? (
          <Placeholder
            icon={<Icon56UsersOutline />}
            title="Формат участия"
            action={
              <div style={{ display: 'flex', gap: 12, flexDirection: 'column', width: 220, margin: '0 auto' }}>
                <Button 
                  size="l" stretched 
                  onClick={() => { setIsParticipant(true); setHasSelectedRole(true); }}
                >
                  Я — Участник
                </Button>
                <Button 
                  size="l" stretched mode="secondary" 
                  onClick={() => { setIsParticipant(false); setHasSelectedRole(true); }}
                >
                  Я — Гость
                </Button>
              </div>
            }
          >
            Пожалуйста, выберите в качестве кого вы планируете посетить мероприятие. От этого зависит процесс регистрации.
          </Placeholder>
        ) : (
          <>
            {eventData?.allowGuests && (
              <SegmentedControl
                size="l"
                name="role"
                value={isParticipant ? 'participant' : 'guest'}
                onChange={(val) => {
                  setIsParticipant(val === 'participant');
                  setErrors({});
                }}
                options={[
                  { label: 'Участник', value: 'participant' },
                  { label: 'Гость', value: 'guest' }
                ]}
                style={{ marginBottom: 16 }}
              />
            )}

            <Group style={{ padding: 0 }}>
              
              <FormItem top="Email" status={errors.email ? 'error' : 'default'} bottom={errors.email}>
                <Input type="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="example@mail.com" />
              </FormItem>

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
              
              <FormItem top="Количество человек в автомобиле" status={errors.passengers ? 'error' : 'default'} bottom={errors.passengers}>
                <Input type="number" name="passengers" value={formData.passengers} onChange={handleInputChange} placeholder="0" />
              </FormItem>

              {isParticipant && (
                <>
                  <FormItem 
                    top="Комментарий к заявке" 
                    status={errors.comment ? 'error' : 'default'} 
                    bottom={errors.comment || 'Опишите ваш автомобиль: спек-лист, историю постройки или особенности (минимум 10 символов)'}
                  >
                    <Textarea 
                      name="comment" 
                      value={formData.comment} 
                      onChange={handleInputChange} 
                      placeholder="Введите комментарий..." 
                    />
                  </FormItem>

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
                </>
              )}

              <FormItem>
                {/* Галочка согласия на обработку ПД */}
                <Checkbox 
                  checked={isAgreed} 
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  style={{ marginBottom: 16 }}
                >
                  Я согласен на обработку персональных данных
                </Checkbox>

                {/* Виджет Яндекс Капчи */}
                <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
                  <SmartCaptcha 
                    sitekey={import.meta.env.VITE_YANDEX_CAPTCHA_SITE_KEY} 
                    onSuccess={setCaptchaToken}
                    onTokenExpired={() => setCaptchaToken('')} 
                  />
                </div>

                <Button 
                  size="l" stretched mode="primary" 
                  loading={isSubmitting} 
                  onClick={handleSubmit}
                  disabled={!captchaToken || isSubmitting || !isAgreed} // Блокируем, если не нажата галочка или нет капчи
                  style={{ marginBottom: 8 }}
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
          </>
        )}
      </Box>
      {snackbar}
    </Panel>
  );
};