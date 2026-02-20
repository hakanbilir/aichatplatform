// Use relative path in production to avoid CORS issues / CORS sorunlarını önlemek için üretimde göreli yol kullan
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000');

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: (body as any)?.error || response.statusText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details: (body as any)?.details,
    };
    throw error;
  }

  return body as T;
}

export async function apiStreamRequest<T>(
  path: string,
  onData: (data: T) => void,
  onError: (error: Error) => void,
  token?: string | null,
  signal?: AbortSignal
): Promise<void> {
  const url = `${API_BASE_URL}${path}`;
  const currentLang = typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') || 'tr' : 'tr';

  const headers: HeadersInit = {
    'Accept': 'text/event-stream',
    'Accept-Language': currentLang,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });

    if (!response.ok) {
      const isJson = response.headers.get('content-type')?.includes('application/json');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body = isJson ? await response.json().catch(() => undefined) : undefined;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const message = (body as any)?.error || response.statusText;
      throw new Error(`HTTP ${response.status}: ${message}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let reading = true;

    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;

        if (trimmed.startsWith('data:')) {
          let data = trimmed.slice(5);
          if (data.startsWith(' ')) {
            data = data.slice(1);
          }

          if (data === 'processing' || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              onError(new Error(parsed.error));
            } else {
              onData(parsed as T);
            }
          } catch (e) {
            console.warn('Failed to parse stream chunk', e);
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onError(err as Error);
    }
  }
}
