// apps/api-gateway/src/providers/base.ts

export type ProviderRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ProviderMessage {
  role: ProviderRole;
  content: string;
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

export interface ModelProvider {
  /**
   * Execute a single-turn chat completion with full history.
   */
  chat(messages: ProviderMessage[], options: ProviderChatOptions): Promise<ProviderChatResult>;
}

