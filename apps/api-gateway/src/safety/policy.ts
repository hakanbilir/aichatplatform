// apps/api-gateway/src/safety/policy.ts

import { prisma } from '@ai-chat/db';
import { ModerationCategory, ModerationResult, ModerationAction, SafetyDecision } from './types';

// Default platform-wide actions (can be overridden by org config unless locked elsewhere)
const PLATFORM_DEFAULTS: Record<ModerationCategory, ModerationAction> = {
  self_harm: 'block',
  hate: 'block',
  sexual_minors: 'block',
  sexual_content: 'warn',
  violence: 'warn',
  harassment: 'warn',
  malware: 'block',
  pii: 'warn',
  prompt_injection: 'warn',
  copyright: 'log_only',
  other: 'log_only'
};

export async function decideSafetyAction(
  orgId: string,
  result: ModerationResult
): Promise<SafetyDecision> {
  const cfg = await prisma.orgSafetyConfig.findUnique({ where: { orgId } });

  const actionMap: Record<string, ModerationAction> = {
    ...PLATFORM_DEFAULTS,
    ...(cfg?.categoryActions as any)
  };

  // Pick max severity category score
  const sorted = [...result.categories].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return {
      action: 'allow',
      categories: [],
      reason: undefined
    };
  }

  const top = sorted[0];
  const action = actionMap[top.category] ?? 'allow';

  let reason: string | undefined;
  switch (action) {
    case 'block':
      reason = `Blocked due to ${top.category} (score=${top.score.toFixed(2)})`;
      break;
    case 'warn':
      reason = `Warning: ${top.category} (score=${top.score.toFixed(2)})`;
      break;
    case 'log_only':
      reason = `Logged category ${top.category}`;
      break;
    default:
      reason = undefined;
  }

  return {
    action,
    categories: sorted,
    reason
  };
}
