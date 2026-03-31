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
export async function getOrgQuotaWindowUsage(
  orgId: string,
  windowDays: number = 30,
): Promise<OrgQuotaWindowUsage> {
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

  // ⚡ Bolt: Use database-level aggregation for token counts
  // 💡 What: Replaced prisma.message.findMany() loop with a prisma.$queryRaw SQL aggregation.
  // 🎯 Why: Previously, fetching all message `meta` JSON payloads into Node.js and summing them in a JavaScript loop was highly inefficient, blocking the event loop and wasting network/memory bandwidth. Doing the sum directly in PostgreSQL is an O(1) network operation.
  // 📊 Impact: Significantly reduces memory overhead and speeds up the quota calculation, especially for organizations with large message histories.
  // 🔬 Measurement: Benchmark getOrgQuotaWindowUsage latency under heavy data load (thousands of messages) using APM or load tests.
  const result: any[] = await prisma.$queryRaw`
    SELECT
      COALESCE(SUM(CASE WHEN m.meta->'usage'->>'promptTokens' ~ '^[0-9]+$' THEN CAST(m.meta->'usage'->>'promptTokens' AS INTEGER) ELSE 0 END), 0) as "promptTokens",
      COALESCE(SUM(CASE WHEN m.meta->'usage'->>'completionTokens' ~ '^[0-9]+$' THEN CAST(m.meta->'usage'->>'completionTokens' AS INTEGER) ELSE 0 END), 0) as "completionTokens"
    FROM "Message" m
    JOIN "Conversation" c ON m."conversationId" = c.id
    WHERE c."orgId" = ${orgId}
      AND m."role" = 'ASSISTANT'
      AND m."createdAt" >= ${from}
  `;

  const row = result[0] || {};
  const totalPromptTokens = Number(row.promptTokens || 0);
  const totalCompletionTokens = Number(row.completionTokens || 0);

  const usageTokens = totalPromptTokens + totalCompletionTokens;

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
