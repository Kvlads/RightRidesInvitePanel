import { apiClient } from '../api/client';

export interface AdminEventData {
  id?: number;
  title: string;
  location: string;
  date: number; // timestamp
  regEndDate: number; // timestamp
  allowGuests: boolean;
  requireApproval: boolean;
  image?: string;
  isActive: boolean;
  registerOpen: boolean;
  description: string;
  approvalText?: string;
  rejectionText?: string;
  customRegister: string | null;
}

export interface VoteData {
  id: number;
  vkId: string;
  name: string;
  decision: 'yes' | 'no';
}

export interface RequestData {
  id: number;
  fio: string;
  email: string | null;
  brand: string;
  plate: string;
  passengers: string;
  comment: string | null;
  status: string;
  photos: { id: number; url: string }[];
  votes: VoteData[];
}

export const deleteEvent = async (id: number): Promise<boolean> => {
  await apiClient(`/admin/events/${id}`, { method: 'DELETE' });
  return true;
};

export const fetchAdminEvent = async (id: number): Promise<AdminEventData> => {
  const data = await apiClient<any>(`/admin/events/${id}`);
  return {
    ...data,
    // Превращаем ISO дату из БД обратно в timestamp для компонентов фронтенда
    date: new Date(data.date).getTime(),
    regEndDate: new Date(data.regEndDate).getTime(),
  };
};

export const saveEvent = async (data: AdminEventData, id?: number): Promise<boolean> => {
  await apiClient('/admin/events/save', {
    method: 'POST',
    body: { ...data, id }
  });
  return true;
};

export const exportParticipants = async (id: number, type: 'guest' | 'participant'): Promise<void> => {
  const data = await apiClient<any[]>(`/admin/events/${id}/participants`, {
    method: 'POST',
    body: {
      type
    }
  });
  
  // Расширили заголовки для CSV
  const headers = ['Имя/ФИО', 'Город', 'Автомобиль', 'Госномер', 'Пассажиров', 'Статус', 'Дата регистрации'];
  
  const csvContent = [
    headers.join(','),
    ...data.map(p => {
      // Оборачиваем значения в кавычки, чтобы запятые внутри текста (если они есть) не сломали CSV
      const row = [
        p.name, 
        p.city, 
        p.brand, 
        p.plate, 
        p.passengers, 
        p.status, 
        new Date(p.date).toLocaleString('ru-RU') // Красивая дата для админа
      ];
      return row.map(value => `"${value}"`).join(',');
    })
  ].join('\n');

  // Добавляем BOM, чтобы Excel правильно открывал русские буквы (UTF-8)
  const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
  const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `participants_event_${id}.csv`);
  link.click();
};

// Метод пока остается моком по вашему требованию
export const sendBroadcastMessage = (id: number, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Рассылка для ${id}: ${message}`);
      resolve(true);
    }, 1000);
  });
};

export interface EventData {
  id: number;
  date: string; // Формат: DD.MM.YYYY
  title: string;
  image: string;
}

export const fetchEvents = async (): Promise<EventData[]> => {
  // Получаем список мероприятий с нашего API
  const rawEvents = await apiClient<any[]>('/admin/events');

  // Мапим данные и форматируем дату для компонентов VK UI
  return rawEvents.map((event) => {
    const d = new Date(event.date);
    
    // Собираем строку DD.MM.YYYY (padStart добавляет ведущий ноль, если число < 10)
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return {
      id: event.id,
      date: `${day}.${month}.${year}`,
      title: event.title,
      // Если у мероприятия в БД нет картинки, подставляем заглушку по умолчанию
      image: event.image || 'https://placehold.co/600x400/EEE/31343C',
    };
  });
};

// Запрос списка заявок
export const fetchRequests = async (eventId: number): Promise<RequestData[]> => {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`/api/admin/events/${eventId}/requests`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Ошибка загрузки заявок');
  return res.json();
};

// Отправка голоса
export const submitVote = async (requestId: number, decision: 'yes' | 'no'): Promise<boolean> => {
  const token = localStorage.getItem('admin_token');
  const res = await fetch(`/api/admin/requests/${requestId}/vote`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ decision })
  });
  return res.ok;
};