// src/api/client.ts

// 1. Единожды сохраняем параметры запуска VK при загрузке скрипта.
// Отсекаем знак '?' в начале строки.
const vkLaunchParams = window.location.search.slice(1);

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
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${vkLaunchParams}`,
    ...options.headers as Record<string, string>,
  };

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