// apps/api-gateway/src/providers/base.ts

export type ProviderRole = 'system' | 'user' | 'assistant' | 'tool';

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; mimeType?: string; data: string };

export interface ProviderMessage {
  role: ProviderRole;
  content: string | ContentPart[];
}

export interface ProviderUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ProviderChatOptions {
  model: string; // provider-specific model key (e.g. "llama3")
  temperature?: number;
  toolsEnabled?: {
    codeExecution?: boolean;
    webSearch?: boolean;
    structuredTools?: boolean;
  };
}

export interface ProviderChatResult {
  content: string;
  usage?: ProviderUsage;
}

import { ChatStreamEvent } from '@ai-chat/core-types';

export interface ModelProvider {
  /**
   * Execute a single-turn chat completion with full history.
   */
  chat(messages: ProviderMessage[], options: ProviderChatOptions): Promise<ProviderChatResult>;

  /**
   * Execute a single-turn streaming chat completion.
   */
  chatStream?(
    messages: ProviderMessage[],
    options: ProviderChatOptions,
  ): AsyncGenerator<ChatStreamEvent, void, unknown>;
}
