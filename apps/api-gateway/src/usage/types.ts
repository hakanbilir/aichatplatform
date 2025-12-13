// apps/api-gateway/src/usage/types.ts

export type UsageFeature = 'chat' | 'playground' | 'experiment';

export interface UsageEvent {
  orgId: string;
  userId?: string;
  conversationId?: string;
  feature: UsageFeature;

  provider: string;
  modelName: string;

  inputTokens: number;
  outputTokens: number;

  // Optional metadata
  metadata?: {
    chatProfileId?: string;
    latencyMs?: number;
    error?: string;
  };
}
