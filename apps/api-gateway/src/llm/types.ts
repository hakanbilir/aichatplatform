// apps/api-gateway/src/llm/types.ts

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  // Future: tool call data, images, etc.
}

export interface ChatToolCall {
  id: string;
  name: string;
  arguments: string; // JSON-encoded
}

export interface ChatCompletionRequest {
  orgId: string;
  modelProvider: string; // from ChatProfile
  modelName: string; // from ChatProfile

  messages: ChatMessage[];

  temperature?: number;
  topP?: number;
  maxTokens?: number | null;

  // Whether to stream tokens back to the client
  stream?: boolean;

  // Future: function/tool calling description, RAG metadata etc.
  tools?: any[];
  toolChoice?: 'auto' | 'none' | { name: string };

  // Contextual metadata – used for logging/metrics only
  metadata?: {
    orgId?: string;
    conversationId?: string;
    messageId?: string;
    chatProfileId?: string;
  };
}

export interface ChatCompletionChunk {
  // null content may represent a tool call or end-of-stream
  delta: string | null;
  done: boolean;

  // optional for richer providers
  toolCalls?: ChatToolCall[];
}

export interface ChatCompletionResponse {
  content: string;
  toolCalls?: ChatToolCall[];
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface LlmChatProvider {
  /**
   * Non-streaming completion: returns full content.
   */
  complete(req: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Streaming completion: yields chunks until done.
   */
  stream(req: ChatCompletionRequest): AsyncIterable<ChatCompletionChunk>;
}
