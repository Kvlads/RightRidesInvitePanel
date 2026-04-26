import { apiClient } from '../api/client';

// --- Вспомогательные типы ---
export type RequestStatus = 'approved' | 'rejected' | 'pending';
export type RequestType = 'guest' | 'participant';

// --- Интерфейсы данных ---

export interface EventData {
  id: number;
  date: string; // Формат DD.MM.YYYY
  title: string;
  image: string;
}

export interface EventDetail {
  id: number;
  title: string;
  image: string;
  dateStart: string;
  regEnd: string;
  description: string;
  location: string;
  allowGuests: boolean;
}

export interface UserStatus {
  hasNewNotifications: boolean;
}

export interface RegistrationData {
  email: string;
  city: string;
  fio: string;
  plate: string;
  brand: string;
  passengers: string;
  photos?: string[]; // Список URL уже загруженных фото
  type: RequestType;
  captchaToken?: string;
  comment?: string;
}

export interface ApplicationRequest {
  id: number;
  brand: string;
  plate: string;
  type: RequestType;
  status: RequestStatus;
}

export interface RequestDetail extends RegistrationData {
  id: number;
  status: RequestStatus;
  photos: string[];
}

// --- Вспомогательные функции ---

/**
 * Преобразует ISO дату с бэкенда в формат DD.MM.YYYY
 */
const formatDate = (dateStr: string | Date): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

// --- Методы API ---

/**
 * Получение списка активных мероприятий для главной страницы
 */
export const fetchEvents = async (): Promise<EventData[]> => {
  const data = await apiClient<any[]>('/user/events');
  return data.map(e => ({
    id: e.id,
    title: e.title,
    date: formatDate(e.date),
    image: e.image || 'https://placehold.co/600x400/EEE/31343C'
  }));
};

/**
 * Получение детальной информации о мероприятии
 */
export const fetchEventById = async (id: number): Promise<EventDetail> => {
  const e = await apiClient<any>(`/user/events/${id}`);
  return {
    id: e.id,
    title: e.title,
    image: e.image || 'https://placehold.co/600x400/EEE/31343C',
    dateStart: formatDate(e.date),
    regEnd: formatDate(e.regEndDate),
    description: e.description || '',
    location: e.location || '',
    allowGuests: e.allowGuests
  };
};

/**
 * Получение статуса пользователя (новые уведомления и т.д.)
 */
export const fetchUserStatus = async (): Promise<UserStatus> => {
  try {
    return await apiClient<UserStatus>('/user/status');
  } catch {
    return { hasNewNotifications: false };
  }
};

/**
 * Регистрация на ивент (отправка формы)
 */
export const submitRegistration = async (eventId: number, data: RegistrationData): Promise<boolean> => {
  await apiClient(`/user/events/${eventId}/register`, {
    method: 'POST',
    body: data
  });
  return true;
};

/**
 * Реальная загрузка фотографии на сервер
 */
export const uploadPhoto = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  // Важно: при отправке FormData через fetch заголовок Content-Type 
  // браузер должен выставить сам, поэтому в apiClient мы это учли.
  const response = await apiClient<{ url: string }>('/upload', {
    method: 'POST',
    body: formData,
    // Переопределяем headers для FormData, чтобы fetch сам поставил boundary
    headers: { 'Accept': 'application/json' } 
  });

  return response.url;
};

/**
 * Получение списка всех заявок текущего пользователя на конкретный ивент
 */
export const fetchRequestsByEventId = async (eventId: number): Promise<ApplicationRequest[]> => {
  // Используйте ваш актуальный путь до эндпоинта
  const data = await apiClient<any[]>(`/user/events/${eventId}/my-requests`); 
  
  return data.map(r => ({
    id: r.id,
    brand: r.brand || '',
    plate: r.plate || '',
    // Теперь мы жестко забираем тип из ответа бэкенда.
    // Если по какой-то причине его нет, фоллбэком ставим 'participant'
    type: r.type as RequestType || 'participant', 
    status: r.status as RequestStatus
  }));
};

/**
 * Детальная информация о конкретной заявке (для просмотра статуса)
 */
export const fetchRequestDetail = async (id: number): Promise<RequestDetail> => {
  const r = await apiClient<any>(`/user/requests/${id}`);
  return {
    id: r.id,
    city: r.city || '',
    fio: r.fio || '',
    plate: r.plate || '',
    brand: r.brand || '',
    passengers: r.passengers || '0',
    status: r.status as RequestStatus,
    photos: r.photos?.map((p: any) => p.url) || [],
    type: r.type,
    email: r.email,
  };
};