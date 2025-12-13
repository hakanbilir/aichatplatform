// apps/api-gateway/src/routes/org-analytics.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';

const usageQuerySchema = z.object({
  days: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return 30;
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 30;
      if (n > 365) return 365;
      return Math.round(n);
    }),
});

export default async function orgAnalyticsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Org-level usage summary (aggregated across all conversations in the org)
  // Org seviyesi kullanım özeti (org'daki tüm konuşmalar genelinde toplanır)
  app.get('/orgs/:id/usage', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }
    const orgId = parseParams.data.id;

    const parseQuery = usageQuerySchema.safeParse(request.query);
    if (!parseQuery.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQueryParams'), details: parseQuery.error.format() });
    }

    const days = parseQuery.data.days;

    // Enforce RBAC – must have analytics:view on this org
    // RBAC uygula – bu org'da analytics:view yetkisi olmalı
    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'analytics:view',
    );

    // Load org plan & quota configuration
    // Org plan ve kota yapılandırmasını yükle
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
      return reply.code(404).send({ error: request.i18n.t('errors.orgNotFound') });
    }

    // Time window – aligned with analytics chart
    // Zaman penceresi – analitik grafiğiyle hizalı
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch ASSISTANT messages for this org in the time window, including conversation.model
    // Bu org için zaman penceresindeki ASSISTANT mesajlarını, conversation.model dahil olmak üzere getir
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
        createdAt: true,
        conversation: {
          select: {
            model: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let completions = 0;
    let firstMessageAt: Date | null = null;
    let lastMessageAt: Date | null = null;

    // Per-day buckets
    // Günlük kovalar
    const dayBuckets = new Map<string, { promptTokens: number; completionTokens: number; totalTokens: number }>();

    // Per-model buckets
    // Model başına kovalar
    const modelBuckets = new Map<
      string,
      {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
        completions: number;
        latencies: number[];
      }
    >();

    for (const m of messages) {
      const meta: any = m.meta ?? {};
      const usage = meta?.usage;

      if (!usage || typeof usage !== 'object') {
        continue;
      }

      const promptTokens = typeof usage.promptTokens === 'number' ? usage.promptTokens : 0;
      const completionTokens = typeof usage.completionTokens === 'number' ? usage.completionTokens : 0;
      const totalTokens = promptTokens + completionTokens;

      totalPromptTokens += promptTokens;
      totalCompletionTokens += completionTokens;
      completions += 1;

      if (!firstMessageAt || m.createdAt < firstMessageAt) {
        firstMessageAt = m.createdAt;
      }
      if (!lastMessageAt || m.createdAt > lastMessageAt) {
        lastMessageAt = m.createdAt;
      }

      const dayKey = m.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
      const dayExisting = dayBuckets.get(dayKey) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      dayExisting.promptTokens += promptTokens;
      dayExisting.completionTokens += completionTokens;
      dayExisting.totalTokens += totalTokens;

      dayBuckets.set(dayKey, dayExisting);

      // Model key – prefer conversation.model, fallback usage.model, else 'unknown'
      // Model anahtarı – conversation.model'i tercih et, yoksa usage.model, yoksa 'unknown'
      const convModel = m.conversation?.model ?? null;
      const usageModel = typeof (usage as any).model === 'string' ? (usage as any).model : null;
      const modelKey = convModel || usageModel || 'unknown';

      const modelExisting = modelBuckets.get(modelKey) ?? {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        completions: 0,
        latencies: [] as number[],
      };

      modelExisting.promptTokens += promptTokens;
      modelExisting.completionTokens += completionTokens;
      modelExisting.totalTokens += totalTokens;
      modelExisting.completions += 1;

      // Latency – try usage.latencyMs, then providerMeta.latencyMs
      // Gecikme – önce usage.latencyMs'i dene, sonra providerMeta.latencyMs
      let latencyMs: number | null = null;
      if (typeof (usage as any).latencyMs === 'number') {
        latencyMs = (usage as any).latencyMs;
      } else if (meta && typeof meta.providerMeta === 'object' && meta.providerMeta !== null) {
        const providerMeta: any = meta.providerMeta;
        if (typeof providerMeta.latencyMs === 'number') {
          latencyMs = providerMeta.latencyMs;
        }
      }

      if (latencyMs !== null && Number.isFinite(latencyMs) && latencyMs >= 0) {
        modelExisting.latencies.push(latencyMs);
      }

      modelBuckets.set(modelKey, modelExisting);
    }

    const byDay = Array.from(dayBuckets.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, stats]) => ({
        date,
        promptTokens: stats.promptTokens,
        completionTokens: stats.completionTokens,
        totalTokens: stats.totalTokens,
      }));

    const totals = {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    };

    const byModel = Array.from(modelBuckets.entries())
      .map(([model, stats]) => {
        let avgLatencyMs = 0;
        let p95LatencyMs = 0;

        if (stats.latencies.length > 0) {
          const sorted = [...stats.latencies].sort((a, b) => a - b);
          const sum = sorted.reduce((acc, v) => acc + v, 0);
          avgLatencyMs = sum / sorted.length;
          const idx = Math.floor(0.95 * (sorted.length - 1));
          p95LatencyMs = sorted[idx] ?? sorted[sorted.length - 1];
        }

        return {
          model,
          promptTokens: stats.promptTokens,
          completionTokens: stats.completionTokens,
          totalTokens: stats.totalTokens,
          completions: stats.completions,
          avgLatencyMs,
          p95LatencyMs,
        };
      })
      // Sort by totalTokens desc for convenience
      // Kolaylık için totalTokens'a göre azalan sırada sırala
      .sort((a, b) => b.totalTokens - a.totalTokens);

    // Quota view – evaluated in the same window as the analytics chart.
    // Kota görünümü – analitik grafiğiyle aynı pencerede değerlendirilir.
    const usageInWindowTokens = totals.totalTokens;

    const quota = {
      monthlySoftLimitTokens: org.monthlySoftLimitTokens,
      monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      usageInWindowTokens,
      softLimitRemainingTokens:
        org.monthlySoftLimitTokens != null
          ? Math.max(org.monthlySoftLimitTokens - usageInWindowTokens, 0)
          : null,
      hardLimitRemainingTokens:
        org.monthlyHardLimitTokens != null
          ? Math.max(org.monthlyHardLimitTokens - usageInWindowTokens, 0)
          : null,
      softLimitExceeded:
        org.monthlySoftLimitTokens != null && usageInWindowTokens >= org.monthlySoftLimitTokens,
      hardLimitExceeded:
        org.monthlyHardLimitTokens != null && usageInWindowTokens >= org.monthlyHardLimitTokens,
    };

    return reply.send({
      orgId,
      range: {
        from: from.toISOString(),
        to: now.toISOString(),
        days,
      },
      plan: org.plan,
      quota,
      totals,
      completions,
      firstMessageAt: firstMessageAt ? firstMessageAt.toISOString() : null,
      lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
      byDay,
      byModel,
    });
  });

  // Enhanced analytics endpoint with detailed breakdowns
  // Detaylı dökümlerle gelişmiş analitik endpoint'i
  app.get('/orgs/:orgId/analytics', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    const querySchema = z.object({
      windowDays: z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .refine((val) => !val || !Number.isNaN(val), {
          message: 'windowDays must be a number'
        })
    });

    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQueryParams'), details: parsedQuery.error.format() });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'analytics:view'
    );

    const { getOrgAnalytics } = await import('../services/orgAnalytics');
    const result = await getOrgAnalytics({
      orgId,
      windowDays: parsedQuery.data.windowDays
    });

    return reply.send(result);
  });
}

