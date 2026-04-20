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
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    // Автоматически прикрепляем подпись VK ко всем запросам
    'Authorization': `Bearer ${vkLaunchParams}`,
    ...options.headers,
  };

  // Если передали объект в body, превращаем его в JSON
  let body = options.body;
  if (body && typeof body === 'object') {
    body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
    body,
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