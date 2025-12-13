// apps/api-gateway/src/safety/types.ts

export type ModerationSource = 'user' | 'assistant' | 'tool';

export type ModerationCategory =
  | 'self_harm'
  | 'hate'
  | 'sexual_minors'
  | 'sexual_content'
  | 'violence'
  | 'harassment'
  | 'malware'
  | 'pii'
  | 'prompt_injection'
  | 'copyright'
  | 'other';

export type ModerationAction = 'block' | 'warn' | 'log_only' | 'allow';

export interface ModerationCategoryScore {
  category: ModerationCategory;
  score: number; // 0..1
}

export interface ModerationResult {
  categories: ModerationCategoryScore[];
  flagged: boolean;
  // engine-specific payload for debugging
  raw: unknown;
}

export interface SafetyDecision {
  action: ModerationAction;
  categories: ModerationCategoryScore[];
  reason?: string;
}
