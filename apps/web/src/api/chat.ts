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
  data: {
    content: string;
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    images?: string[];
  },
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
  | { type: 'tool_start'; toolName: string; toolCallId?: string }
  | { type: 'tool_end'; toolName: string; toolCallId?: string; toolResult?: unknown }
  | { type: 'thought_start' }
  | { type: 'thought_token'; token: string }
  | { type: 'thought_end' }
  | {
      type: 'end';
      finalMessage?: { role: string; content: string };
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
  data: {
    content: string;
    model?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    images?: string[];
  },
  onEvent: (event: StreamEvent) => void,
  signal?: AbortSignal,
  retryCount: number = 0,
): Promise<void> {
  // Use relative path in production to avoid CORS issues / CORS sorunlarını önlemek için üretimde göreli yol kullan
  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000');
  const url = `${API_BASE_URL}/conversations/${conversationId}/stream`;

  let attempt = 0;
  while (attempt <= retryCount) {
    try {
      if (signal?.aborted) return;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
        signal,
      });

      if (!response.ok) {
        // Retry on 5xx errors
        if (response.status >= 500 && attempt < retryCount) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Non-retryable error
        onEvent({ type: 'error', error: `HTTP ${response.status} ${response.statusText}` });
        return;
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      onEvent({ type: 'start' });

      let reading = true;
      while (reading) {
        const { done, value } = await reader.read();
        if (done) {
          reading = false;
          break;
        }

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

      // Success, break retry loop
      return;
    } catch (err) {
      const isAbort = (err as Error).name === 'AbortError' || signal?.aborted;
      if (isAbort) return;

      if (attempt < retryCount) {
        attempt++;
        // Exponential backoff: 1s, 2s, 4s...
        const delay = 1000 * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      onEvent({ type: 'error', error: (err as Error).message });
      return;
    }
  }
}
