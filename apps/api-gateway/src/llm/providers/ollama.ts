// apps/api-gateway/src/llm/providers/ollama.ts

import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  LlmChatProvider
} from '../types';

interface OllamaConfig {
  baseUrl: string;
}

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaChatProvider implements LlmChatProvider {
  private readonly baseUrl: string;

  constructor(config: OllamaConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
  }

  private mapMessages(messages: ChatCompletionRequest['messages']): OllamaChatMessage[] {
    return messages
      .filter((m) => m.role === 'system' || m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'system' | 'user' | 'assistant', content: m.content }));
  }

  async complete(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const body = {
      model: req.modelName,
      messages: this.mapMessages(req.messages),
      stream: false,
      options: {
        temperature: req.temperature ?? 0.7,
        top_p: req.topP ?? 1.0,
        num_predict: req.maxTokens ?? undefined
      }
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Ollama chat error (${res.status}): ${text}`);
    }

    const json: any = await res.json();

    const content: string = json.message?.content ?? '';

    // Extract usage if available from Ollama response
    // Ollama yanıtından kullanım bilgisi varsa çıkar
    const usage = json.eval_count || json.prompt_eval_count
      ? {
          promptTokens: json.prompt_eval_count ?? 0,
          completionTokens: json.eval_count ?? 0,
          totalTokens: (json.prompt_eval_count ?? 0) + (json.eval_count ?? 0)
        }
      : undefined;

    return { content, usage }; // toolCalls omitted for now
  }

  async *stream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk> {
    const body = {
      model: req.modelName,
      messages: this.mapMessages(req.messages),
      stream: true,
      options: {
        temperature: req.temperature ?? 0.7,
        top_p: req.topP ?? 1.0,
        num_predict: req.maxTokens ?? undefined
      }
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ollama stream error (${res.status}): ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunkText = decoder.decode(value, { stream: true });

        // Ollama streams one JSON object per line
        const lines = chunkText.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const token: string = data.message?.content ?? '';
            const doneChunk: boolean = Boolean(data.done);

            yield {
              delta: token || null,
              done: doneChunk
            };
          } catch (err) {
            // Ignore malformed lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Final completion
    yield { delta: null, done: true };
  }
}
