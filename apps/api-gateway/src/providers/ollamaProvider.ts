// apps/api-gateway/src/providers/ollamaProvider.ts

import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage, MessageContent } from './base';
import { getConfig } from '@ai-chat/config';
import { ChatStreamEvent } from '@ai-chat/core-types';

const getOllamaBaseUrl = (): string => {
  const config = getConfig();
  return config.OLLAMA_BASE_URL;
};

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[];
}

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

function parseContentForOllama(content: MessageContent): { content: string; images?: string[] } {
  if (typeof content === 'string') {
    return { content };
  }

  let text = '';
  const images: string[] = [];

  for (const part of content) {
    if (part.type === 'text') {
      text += part.text;
    } else if (part.type === 'image_url') {
      // Strip data URI prefix if present to get raw base64
      const url = part.image_url.url;
      const base64 = url.replace(/^data:image\/\w+;base64,/, '');
      images.push(base64);
    }
  }

  return { content: text, images: images.length > 0 ? images : undefined };
}

export class OllamaProvider implements ModelProvider {
  async chat(messages: ProviderMessage[], options: ProviderChatOptions): Promise<ProviderChatResult> {
    const baseUrl = getOllamaBaseUrl();

    const mappedMessages: OllamaChatMessage[] = messages.map((m) => {
      const { content, images } = parseContentForOllama(m.content);
      return {
        role: m.role === 'tool' ? 'assistant' : (m.role as 'system' | 'user' | 'assistant'),
        content,
        images
      };
    });

    const body: OllamaChatRequestBody = {
      model: options.model,
      messages: mappedMessages,
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
      throw new Error(`Ollama chat failed with status ${response.status}: ${text || response.statusText}`);
    }

    const json = (await response.json()) as OllamaChatResponse;

    return {
      content: json.message?.content ?? '',
      usage: json.eval_count ? {
        completionTokens: json.eval_count,
        promptTokens: json.prompt_eval_count || 0,
        totalTokens: (json.eval_count || 0) + (json.prompt_eval_count || 0)
      } : undefined
    };
  }

  async *chatStream(messages: ProviderMessage[], options: ProviderChatOptions): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const baseUrl = getOllamaBaseUrl();

    const mappedMessages: OllamaChatMessage[] = messages.map((m) => {
      const { content, images } = parseContentForOllama(m.content);
      return {
        role: m.role === 'tool' ? 'assistant' : (m.role as 'system' | 'user' | 'assistant'),
        content,
        images
      };
    });

    const body: OllamaChatRequestBody = {
      model: options.model,
      messages: mappedMessages,
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
      throw new Error(`Ollama stream failed with status ${response.status}: ${text || response.statusText}`);
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

        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
                const chunk = JSON.parse(trimmed) as OllamaChatResponse;

                if (chunk.message?.content) {
                    yield {
                        type: 'token',
                        token: chunk.message.content
                    };
                }

                if (chunk.done) {
                    yield {
                        type: 'end',
                        usage: chunk.eval_count ? {
                             completionTokens: chunk.eval_count,
                             promptTokens: chunk.prompt_eval_count || 0,
                             totalTokens: (chunk.eval_count || 0) + (chunk.prompt_eval_count || 0)
                        } : undefined
                    };
                }
            } catch {
                // Ignore
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
