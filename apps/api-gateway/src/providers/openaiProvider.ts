import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage } from './base';
import { getConfig } from '@ai-chat/config';
import { ChatStreamEvent } from '@ai-chat/core-types';

export class OpenAIProvider implements ModelProvider {
  private getApiKey(): string {
    const config = getConfig();
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return config.OPENAI_API_KEY;
  }

  private mapMessages(messages: ProviderMessage[]) {
    return messages.map((m) => ({
      role: m.role === 'tool' ? 'tool' : (m.role as 'system' | 'user' | 'assistant'),
      content: m.content,
    }));
  }

  async chat(messages: ProviderMessage[], options: ProviderChatOptions): Promise<ProviderChatResult> {
    const apiKey = this.getApiKey();

    const body: any = {
      model: options.model,
      messages: this.mapMessages(messages),
      temperature: options.temperature,
      stream: false,
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI chat failed with status ${response.status}: ${text}`);
    }

    const json = await response.json() as any;
    const content = json.choices?.[0]?.message?.content || '';
    const usage = json.usage;

    return {
      content,
      usage: {
        promptTokens: usage?.prompt_tokens,
        completionTokens: usage?.completion_tokens,
        totalTokens: usage?.total_tokens,
      },
    };
  }

  async *chatStream(messages: ProviderMessage[], options: ProviderChatOptions): AsyncGenerator<ChatStreamEvent, void, unknown> {
    const apiKey = this.getApiKey();

    const body: any = {
      model: options.model,
      messages: this.mapMessages(messages),
      temperature: options.temperature,
      stream: true,
      stream_options: { include_usage: true }
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`OpenAI stream failed with status ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('OpenAI response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let ended = false;

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
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const chunk = JSON.parse(jsonStr);

            if (chunk.usage) {
               ended = true;
               yield {
                 type: 'end',
                 usage: {
                   promptTokens: chunk.usage.prompt_tokens,
                   completionTokens: chunk.usage.completion_tokens,
                   totalTokens: chunk.usage.total_tokens
                 }
               };
               continue;
            }

            const delta = chunk.choices?.[0]?.delta;
            const finishReason = chunk.choices?.[0]?.finish_reason;

            if (delta?.content) {
              yield {
                type: 'token',
                token: delta.content
              };
            }

            // OpenAI usage chunk comes after finish_reason: stop, so we wait for usage to send 'end'.
          } catch (e) {
             console.warn('Failed to parse OpenAI chunk', e);
          }
        }
      }
    } catch (err) {
      yield { type: 'error', error: (err as Error).message };
    } finally {
      reader.releaseLock();
    }

    if (!ended) {
      yield { type: 'end' };
    }
  }
}
