export const deleteEvent = (id: number): Promise<boolean> => {
  id;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 0);
  });
};

export interface AdminEventData {
  title: string;
  location: string;
  date: number; // timestamp
  regEndDate: number; // timestamp
  allowGuests: boolean;
  requireApproval: boolean;
  image?: string;
  isActive: boolean
}

export const fetchAdminEvent = (id: number): Promise<AdminEventData> => {
  id;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        title: 'Тестовое мероприятие',
        location: 'Москва, парк Горького',
        date: 1716200000000,
        regEndDate: 1715768000000,
        allowGuests: true,
        requireApproval: false,
        image: 'https://placehold.co/600x400/EEE/31343C',
        isActive: true,
      });
    }, 300);
  });
};

export const saveEvent = (data: AdminEventData, id?: number): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Сохранение данных:', data, 'ID:', id);
      resolve(true);
    }, 300);
  });
};

export const exportParticipants = (id: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Запущен экспорт участников для ID: ${id}`);
      resolve();
    }, 300);
  });
};

export const sendBroadcastMessage = (id: number, message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`Сообщение отправлено для ID ${id}: ${message}`);
      resolve(true);
    }, 1000);
  });
};