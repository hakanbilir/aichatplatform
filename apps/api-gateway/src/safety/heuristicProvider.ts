// apps/api-gateway/src/safety/heuristicProvider.ts

import { ModerationProvider } from './provider';
import { ModerationResult } from './types';
import { ModerationCategoryScore, ModerationCategory } from './types';

const BLOCKLIST: { category: ModerationCategory; patterns: RegExp[] }[] = [
  {
    category: 'self_harm',
    patterns: [/kill myself/i, /suicide/i, /end my life/i]
  },
  {
    category: 'prompt_injection',
    patterns: [/ignore previous instructions/i, /you must forget the rules/i, /system: override/i]
  },
  {
    category: 'hate',
    patterns: [/hate speech/i, /discriminatory/i]
  },
  {
    category: 'violence',
    patterns: [/kill you/i, /harm/i, /violence/i]
  }
  // Extend as needed
];

export class HeuristicModerationProvider implements ModerationProvider {
  async moderate(text: string): Promise<ModerationResult> {
    const scores: ModerationCategoryScore[] = [];

    for (const item of BLOCKLIST) {
      const hit = item.patterns.some((re) => re.test(text));
      if (hit) {
        scores.push({ category: item.category, score: 0.99 });
      }
    }

    const flagged = scores.length > 0;

    return {
      categories: scores,
      flagged,
      raw: { heuristic: true }
    };
  }
}
