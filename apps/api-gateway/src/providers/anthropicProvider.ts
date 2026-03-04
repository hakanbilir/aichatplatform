import { getConfig } from '@ai-chat/config';
import { ChatStreamEvent } from '@ai-chat/core-types';

import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage } from './base';

export class AnthropicProvider implements ModelProvider {
  private getApiKey(): string {
    const config = getConfig();
    if (!config.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    return config.ANTHROPIC_API_KEY;
  }

  private parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      // Fallback for raw base64 or other formats
      return { mediaType: 'image/jpeg', data: dataUrl };
    }
    return { mediaType: matches[1], data: matches[2] };
  }

  private mapMessages(messages: ProviderMessage[]): { system?: string; messages: any[] } {
    let system: string | undefined;
    const mappedMessages: any[] = [];

    for (const m of messages) {
      if (m.role === 'system') {
        if (typeof m.content === 'string') {
          system = (system ? system + '\n' : '') + m.content;
        }
        continue;
      }

      const role = m.role === 'tool' ? 'user' : m.role === 'assistant' ? 'assistant' : 'user';

      let content: any;
      if (typeof m.content === 'string') {
        content = m.content;
      } else {
        content = m.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          const { mediaType, data } = this.parseDataUrl(part.data);
          return {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: data,
            },
          };
        });
      }

      mappedMessages.push({ role, content });
    }
    return { system, messages: mappedMessages };
  }

  async chat(
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): Promise<ProviderChatResult> {
    const apiKey = this.getApiKey();
    const { system, messages: anthropicMessages } = this.mapMessages(messages);

    const body: any = {
      model: options.model,
      messages: anthropicMessages,
      max_tokens: 4096,
      system,
      temperature: options.temperature,
      stream: false,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Anthropic chat failed with status ${response.status}: ${text}`);
    }

    const json = (await response.json()) as any;
    const content = json.content?.[0]?.text || '';
    const usage = json.usage;

    return {
      content,
      usage: {
        promptTokens: usage?.input_tokens,
        completionTokens: usage?.output_tokens,
        totalTokens: (usage?.input_tokens || 0) + (usage?.output_tokens || 0),
      },
    };
  }

  async *chatStream(
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const apiKey = this.getApiKey();
    const { system, messages: anthropicMessages } = this.mapMessages(messages);

    const body: any = {
      model: options.model,
      messages: anthropicMessages,
      max_tokens: 4096,
      system,
      temperature: options.temperature,
      stream: true,
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Anthropic stream failed with status ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('Anthropic response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    yield { type: 'start' };

    let inputTokens = 0;
    let outputTokens = 0;

    try {
      let isDone = false;
      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) {
          isDone = true;
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;

          if (trimmed === 'data: [DONE]') continue;

          const jsonStr = trimmed.slice(6);
          try {
            const chunk = JSON.parse(jsonStr);

            if (chunk.type === 'message_start') {
              if (chunk.message?.usage) {
                inputTokens += chunk.message.usage.input_tokens || 0;
              }
            }

            if (chunk.type === 'content_block_delta') {
              if (chunk.delta?.type === 'text_delta') {
                yield {
                  type: 'token',
                  token: chunk.delta.text,
                };
              }
            }

            if (chunk.type === 'message_delta') {
              if (chunk.usage) {
                outputTokens = chunk.usage.output_tokens || 0;
              }
            }
          } catch {
            // Ignore parse errors for non-JSON data lines
          }
        }
      }
    } catch (err) {
      yield { type: 'error', error: (err as Error).message };
    } finally {
      reader.releaseLock();
    }

    yield {
      type: 'end',
      usage: {
        promptTokens: inputTokens,
        completionTokens: outputTokens,
        totalTokens: inputTokens + outputTokens,
      },
    };
  }
}
