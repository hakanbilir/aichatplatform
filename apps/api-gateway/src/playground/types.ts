// apps/api-gateway/src/playground/types.ts

export interface PlaygroundCompletionRequest {
  orgId: string;
  userId: string;

  // Optional ChatProfile ID. If provided, overrides model config.
  chatProfileId?: string | null;

  modelProvider?: string;
  modelName?: string;

  // Direct prompt for single-turn
  prompt: string;

  // Optional system prompt (if no ChatProfile or template)
  systemPrompt?: string;

  temperature?: number;
  topP?: number;
  maxTokens?: number | null;

  stream?: boolean;
}

export interface PlaygroundCompletionResponse {
  sessionId: string;
  output: string;
  latencyMs?: number;
}
