// apps/api-gateway/src/providers/ollamaProvider.ts

import { getConfig } from '@ai-chat/config';
import { ChatStreamEvent } from '@ai-chat/core-types';

import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage } from './base';

const getOllamaBaseUrl = (): string => {
  const config = getConfig();
  return config.OLLAMA_BASE_URL;
};

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const toOllamaContent = (content: ProviderMessage['content']): string => {
  if (typeof content === 'string') {
    return content;
  }

  return content.map((part) => (part.type === 'text' ? part.text : '[image]')).join('\n');
};

interface OllamaChatRequestBody {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
  };
}

interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
}

export class OllamaProvider implements ModelProvider {
  async chat(
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): Promise<ProviderChatResult> {
    const baseUrl = getOllamaBaseUrl();
    const body: OllamaChatRequestBody = {
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role === 'tool' ? 'assistant' : (m.role as 'system' | 'user' | 'assistant'),
        content: toOllamaContent(m.content),
      })),
      stream: false,
      options: {
        temperature: options.temperature,
      },
    };

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Ollama chat failed with status ${response.status}: ${text || response.statusText}`,
      );
    }

    const json = (await response.json()) as OllamaChatResponse;

    return {
      content: json.message?.content ?? '',
      usage: json.eval_count
        ? {
            completionTokens: json.eval_count,
            promptTokens: json.prompt_eval_count || 0,
            totalTokens: (json.eval_count || 0) + (json.prompt_eval_count || 0),
          }
        : undefined,
    };
  }

  async *chatStream(
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const baseUrl = getOllamaBaseUrl();
    const body: OllamaChatRequestBody = {
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role === 'tool' ? 'assistant' : (m.role as 'system' | 'user' | 'assistant'),
        content: toOllamaContent(m.content),
      })),
      stream: true,
      options: {
        temperature: options.temperature,
      },
    };

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Ollama stream failed with status ${response.status}: ${text || response.statusText}`,
      );
    }

    if (!response.body) {
      throw new Error('Ollama response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    yield { type: 'start' };

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Ollama sends JSON objects, one per line (usually, but we should handle parsing carefully)
        // But Ollama sometimes just concatenates JSONs.
        // Assuming strict JSON lines for now, but scanning for objects is safer.
        // Let's use simple line splitting as Ollama is usually well behaved.

        // However, a single chunk might contain partial JSON or multiple JSONs.
        // Since Ollama output is not SSE but raw JSON stream (ndjson), we iterate lines.

        // Fix: Ollama emits valid JSON objects. We need to parse them.

        // Simple brace counting or regex matching is hard.
        // But Ollama documentation says "stream of JSON objects".

        const lines = buffer.split('\n');
        // If the last line is not empty, it might be incomplete.
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          try {
            const chunk = JSON.parse(trimmed) as OllamaChatResponse;

            if (chunk.message?.content) {
              yield {
                type: 'token',
                token: chunk.message.content,
              };
            }

            if (chunk.done) {
              yield {
                type: 'end',
                usage: chunk.eval_count
                  ? {
                      completionTokens: chunk.eval_count,
                      promptTokens: chunk.prompt_eval_count || 0,
                      totalTokens: (chunk.eval_count || 0) + (chunk.prompt_eval_count || 0),
                    }
                  : undefined,
              };
            }
          } catch {
            // Ignore parse errors for partial lines (though we try to handle that with buffer)
          }
        }
      }
    } catch (err) {
      yield { type: 'error', error: (err as Error).message };
    } finally {
      reader.releaseLock();
    }
  }
}
