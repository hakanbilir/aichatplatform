import { getConfig } from '@ai-chat/config';
import { ChatStreamEvent } from '@ai-chat/core-types';

import { ModelProvider, ProviderChatOptions, ProviderChatResult, ProviderMessage } from './base';

export class OpenAIProvider implements ModelProvider {
  private getApiKey(): string {
    const config = getConfig();
    if (!config.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }
    return config.OPENAI_API_KEY;
  }

  private mapMessages(messages: ProviderMessage[]) {
    return messages.map((m) => {
      const role = m.role === 'tool' ? 'tool' : (m.role as 'system' | 'user' | 'assistant');

      if (typeof m.content === 'string') {
        return { role, content: m.content };
      }

      // Handle multimodal content
      return {
        role,
        content: m.content.map((part) => {
          if (part.type === 'text') {
            return { type: 'text', text: part.text };
          }
          return {
            type: 'image_url',
            image_url: {
              url: part.data
            }
          };
        })
      };
    });
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
      // stream_options: { include_usage: true } // Supported in newer OpenAI models
    };

    // Add usage support if model supports it (generic check)
    // We'll optimistically request it
    body.stream_options = { include_usage: true };

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
               yield {
                 type: 'end', // Usage usually comes in the last chunk which might be 'end' equivalent
                 // Actually we should yield a dedicated usage update or attach to end.
                 // Core types `end` event has usage.
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

            if (finishReason === 'stop') {
              // We'll emit 'end' at the very end of the loop logic or rely on usage chunk.
              // But OpenAI might send usage AFTER stop.
            }
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

    // Ensure we send an end event if not sent (simple logic)
    // Since we stream tokens, the consumer accumulates.
    // We can yield a final empty end to signify completion if usage wasn't received.
    yield { type: 'end' };
  }
}
