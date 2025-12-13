const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const url = `${API_BASE_URL}${path}`;

  // Get current language from localStorage for Accept-Language header
  // Accept-Language başlığı için localStorage'dan mevcut dili al
  const currentLang = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') || 'tr' : 'tr';

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept-Language': currentLang,
    ...(options.headers || {}),
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => undefined) : undefined;

  if (!response.ok) {
    // Error messages from backend are already localized based on Accept-Language header
    // Backend'den gelen hata mesajları zaten Accept-Language başlığına göre yerelleştirilmiş
    const error: ApiError = {
      status: response.status,
      message: (body as any)?.error || response.statusText,
      details: (body as any)?.details,
    };
    throw error;
  }

  return body as T;
}

