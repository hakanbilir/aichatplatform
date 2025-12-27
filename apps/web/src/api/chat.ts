import { apiRequest } from './client';

export interface SendMessageResponse {
  conversationId: string;
  userMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
  assistantMessage: {
    id: string;
    role: string;
    content: string;
    createdAt: string;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function sendMessage(
  token: string,
  conversationId: string,
  data: { content: string; model?: string; temperature?: number; topP?: number; maxTokens?: number },
): Promise<SendMessageResponse> {
  return apiRequest<SendMessageResponse>(
    `/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
}

export type StreamEvent =
  | { type: 'start' }
  | { type: 'token'; token: string }
  | {
      type: 'end';
      message: { role: string; content: string };
      usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
    }
  | { type: 'error'; error: string };

/**
 * Streaming chat helper using fetch + ReadableStream.
 *
 * onEvent is called for each parsed SSE event.
 * onEvent her ayrıştırılmış SSE event'i için çağrılır.
 */
export async function streamMessage(
  token: string,
  conversationId: string,
  data: { content: string; model?: string; temperature?: number; topP?: number; maxTokens?: number },
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  // Use relative path in production to avoid CORS issues / CORS sorunlarını önlemek için üretimde göreli yol kullan
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000');
  const url = `${API_BASE_URL}/conversations/${conversationId}/stream`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    signal,
  });

  if (!response.ok || !response.body) {
    onEvent({ type: 'error', error: `HTTP ${response.status} ${response.statusText}` });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  onEvent({ type: 'start' });

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const jsonPart = trimmed.slice('data:'.length).trim();
      if (!jsonPart) continue;

      try {
        const evt = JSON.parse(jsonPart) as StreamEvent;
        onEvent(evt);
      } catch (err) {
        onEvent({ type: 'error', error: (err as Error).message });
      }
    }
  }
}

