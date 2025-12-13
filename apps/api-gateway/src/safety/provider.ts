// apps/api-gateway/src/safety/provider.ts

import { ModerationResult } from './types';

export interface ModerationProvider {
  moderate(
    text: string,
    context?: { orgId?: string; userId?: string }
  ): Promise<ModerationResult>;
}

let provider: ModerationProvider | null = null;

export function setModerationProvider(impl: ModerationProvider) {
  provider = impl;
}

export function getModerationProvider(): ModerationProvider {
  if (!provider) {
    throw new Error('Moderation provider not configured');
  }
  return provider;
}
