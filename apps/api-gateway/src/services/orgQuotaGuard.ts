// apps/api-gateway/src/services/orgQuotaGuard.ts

import { prisma } from '@ai-chat/db';

export type OrgPlan = 'FREE' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export interface OrgQuotaWindowUsage {
  orgId: string;
  plan: OrgPlan;
  windowDays: number;
  usageTokens: number;
  monthlySoftLimitTokens: number | null;
  monthlyHardLimitTokens: number | null;
  softLimitRemainingTokens: number | null;
  hardLimitRemainingTokens: number | null;
  softLimitExceeded: boolean;
  hardLimitExceeded: boolean;
}

/**
 * Compute total token usage for an org within a rolling window, based on
 * ASSISTANT messages' `meta.usage` (promptTokens + completionTokens).
 * Bir org için yuvarlanan pencere içindeki toplam token kullanımını hesapla,
 * ASSISTANT mesajlarının `meta.usage`'ına (promptTokens + completionTokens) dayalı olarak.
 */
export async function getOrgQuotaWindowUsage(orgId: string, windowDays: number = 30): Promise<OrgQuotaWindowUsage> {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      plan: true,
      monthlySoftLimitTokens: true,
      monthlyHardLimitTokens: true,
    },
  });

  if (!org) {
    throw new Error(`Org not found for quota guard: ${orgId}`);
  }

  const now = new Date();
  const from = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);

  const messages = await prisma.message.findMany({
    where: {
      role: 'ASSISTANT',
      createdAt: {
        gte: from,
      },
      conversation: {
        orgId,
      },
    },
    select: {
      meta: true,
    },
  });

  let usageTokens = 0;

  for (const m of messages) {
    const meta: any = m.meta ?? {};
    const usage = meta?.usage;

    if (!usage || typeof usage !== 'object') {
      continue;
    }

    const promptTokens = typeof usage.promptTokens === 'number' ? usage.promptTokens : 0;
    const completionTokens = typeof usage.completionTokens === 'number' ? usage.completionTokens : 0;

    usageTokens += promptTokens + completionTokens;
  }

  const monthlySoftLimitTokens = org.monthlySoftLimitTokens ?? null;
  const monthlyHardLimitTokens = org.monthlyHardLimitTokens ?? null;

  const softLimitRemainingTokens =
    monthlySoftLimitTokens != null ? Math.max(monthlySoftLimitTokens - usageTokens, 0) : null;

  const hardLimitRemainingTokens =
    monthlyHardLimitTokens != null ? Math.max(monthlyHardLimitTokens - usageTokens, 0) : null;

  const softLimitExceeded = monthlySoftLimitTokens != null && usageTokens >= monthlySoftLimitTokens;

  const hardLimitExceeded = monthlyHardLimitTokens != null && usageTokens >= monthlyHardLimitTokens;

  return {
    orgId,
    plan: org.plan as OrgPlan,
    windowDays,
    usageTokens,
    monthlySoftLimitTokens,
    monthlyHardLimitTokens,
    softLimitRemainingTokens,
    hardLimitRemainingTokens,
    softLimitExceeded,
    hardLimitExceeded,
  };
}

