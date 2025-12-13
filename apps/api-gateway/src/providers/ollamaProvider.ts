// apps/api-gateway/src/providers/ollamaProvider.ts

import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage } from './base';
import { getConfig } from '@ai-chat/config';

const getOllamaBaseUrl = (): string => {
  const config = getConfig();
  return config.OLLAMA_BASE_URL;
};

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
  // Additional fields (durations, eval counts) are ignored here.
}

export class OllamaProvider implements ModelProvider {
  async chat(messages: ProviderMessage[], options: ProviderChatOptions): Promise<ProviderChatResult> {
    const baseUrl = getOllamaBaseUrl();
    const body: OllamaChatRequestBody = {
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role === 'tool' ? 'assistant' : (m.role as 'system' | 'user' | 'assistant'),
        content: m.content,
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
      throw new Error(`Ollama chat failed with status ${response.status}: ${text || response.statusText}`);
    }

    const json = (await response.json()) as OllamaChatResponse;

    return {
      content: json.message?.content ?? '',
      // Ollama does not currently return token counts in a standard way; usage is left undefined.
    };
  }
}

