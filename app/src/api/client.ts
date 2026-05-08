// src/api/client.ts

// Базовый URL до нашего бэкенда. 
// В Dev-режиме запросы пойдут на прокси Vite, в Prod - на Nginx
const BASE_URL = '/api'; 

interface RequestOptions extends RequestInit {
  body?: any;
}

/**
 * Универсальный метод для отправки запросов к нашему API
 */
export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  // 1. Берем токен администратора из LocalStorage
  const adminToken = localStorage.getItem('admin_token');

  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
  };

  // Подставляем токен, только если он реально существует
  if (adminToken && adminToken !== 'undefined') {
    headers['Authorization'] = `Bearer ${adminToken}`;
  }

  let body = options.body;

  // Если мы отправляем FormData (файлы), мы НЕ должны ставить Content-Type, 
  // браузер сам подставит нужный boundary. И мы НЕ должны делать JSON.stringify
  if (body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body: body as BodyInit,
  });

  // 2. Глобальный перехват ошибок авторизации
  if ((response.status === 401 || response.status === 403) && /^admin$/i.test(endpoint)) {
    // Очищаем токен, так как сессия истекла или доступ закрыт
    localStorage.removeItem('admin_token'); 
    window.location.hash = '#/admin-login'; // Перенаправляем на экран логина
    
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Сессия истекла или нет доступа. Пожалуйста, авторизуйтесь.');
  }

  // 3. Обработка остальных ошибок
  if (!response.ok) {
    // Выкидываем ошибку, чтобы её можно было перехватить через try/catch в компонентах
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Ошибка запроса: ${response.status}`);
  }

  // Если сервер вернул пустой ответ (например, статус 204), не пытаемся парсить JSON
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}