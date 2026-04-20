// ------------------------
// Список ивентов
// ------------------------

export interface EventData {
  id: number;
  date: string;
  title: string;
  image: string;
}

const mockEvents: EventData[] = [
  { id: 1, date: '20.05.2026', title: 'IT Конференция', image: 'https://placehold.co/600x400/EEE/31343C' },
  { id: 2, date: '25.05.2026', title: 'Мастер-класс по Node.js', image: 'https://placehold.co/600x400/EEE/31343C' },
  { id: 3, date: '01.06.2026', title: 'Хакатон', image: 'https://placehold.co/600x400/EEE/31343C' },
  { id: 4, date: '10.06.2026', title: 'Встреча разработчиков', image: 'https://placehold.co/600x400/EEE/31343C' },
  { id: 5, date: '15.06.2026', title: 'Летний митап', image: 'https://placehold.co/600x400/EEE/31343C' },
];

export const fetchEvents = (): Promise<EventData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockEvents);
    }, 0);
  });
};

// ------------------------
// Информация о ивенте
// ------------------------

export interface EventDetail {
  id: number;
  title: string;
  image: string;
  dateStart: string;
  regEnd: string;
  description: string;
}

export const fetchEventById = (id: number): Promise<EventDetail> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        title: 'IT Конференция',
        image: 'https://placehold.co/600x400/EEE/31343C',
        dateStart: '20.05.2026',
        regEnd: '15.05.2026',
        description: 'Масштабная конференция для разработчиков, дизайнеров и менеджеров. Обсуждаем тренды 2026 года.',
      });
    }, 0);
  });
};

export interface UserStatus {
  hasNewNotifications: boolean;
}

// Имитация ответа от API
export const fetchUserStatus = (): Promise<UserStatus> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ hasNewNotifications: true });
    }, 0);
  });
};

// ------------------------
// Регистрация на ивент
// ------------------------

export interface RegistrationData {
  city: string;
  fio: string;
  plate: string;
  brand: string;
  passengers: string;
}

// Имитация отправки формы
export const submitRegistration = (data: RegistrationData): Promise<boolean> => {
  data;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 0);
  });
};

// Имитация загрузки файла на сервер
export const uploadPhotoMock = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Возвращаем локальный URL для превью после имитации сетевой задержки
      resolve(URL.createObjectURL(file));
    }, 0);
  });
};

// ------------------------
// Заявки пользователя на ивент
// ------------------------

export type RequestStatus = 'approved' | 'rejected' | 'pending';
export type RequestType = 'guest' | 'participant';

export interface ApplicationRequest {
  id: number;
  brand: string;
  plate: string;
  type: RequestType;
  status: RequestStatus;
}

// Имитация получения списка заявок по ID мероприятия
export const fetchRequestsByEventId = (eventId: number): Promise<ApplicationRequest[]> => {
  eventId;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, brand: 'Toyota Camry', plate: 'А111АА77', type: 'participant', status: 'approved' },
        { id: 2, brand: 'BMW X5', plate: 'В222ВВ77', type: 'participant', status: 'rejected' },
        { id: 3, brand: 'Lada Vesta', plate: 'С333СС77', type: 'guest', status: 'pending' }, // Гость
        { id: 4, brand: 'Kia Rio', plate: 'Е444ЕЕ77', type: 'participant', status: 'pending' }, // Не просмотрена
      ]);
    }, 300);
  });
};

// ------------------------
// Получение деталей регистрации пользователя
// ------------------------

export interface RequestDetail extends RegistrationData {
  id: number;
  photos: string[]; // Массив URL фотографий
}

// Имитация получения детальной информации о заявке
export const fetchRequestDetail = (id: number): Promise<RequestDetail> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        city: 'Москва',
        fio: 'Иванов Иван Иванович',
        plate: 'А111АА77',
        brand: 'Toyota Camry',
        passengers: '2',
        photos: [
          'https://images.unsplash.com/photo-1550355291-bbee04a92027',
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d'
        ]
      });
    }, 0);
  });
};