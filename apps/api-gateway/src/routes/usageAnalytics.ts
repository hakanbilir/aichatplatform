// apps/api-gateway/src/routes/usageAnalytics.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const usageQuerySchema = z.object({
  from: z.string().optional(), // ISO date string (YYYY-MM-DD)
  to: z.string().optional(),
  feature: z.string().optional() // optional filter: 'chat', 'playground', etc.
});

function parseDateOrFallback(input: string | undefined, fallback: Date): Date {
  if (!input) return fallback;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

export default async function usageAnalyticsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/analytics/usage', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:analytics:read'
    );

    const parsed = usageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY', details: parsed.error.format() });
    }

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // last 30 days

    const fromDate = parseDateOrFallback(parsed.data.from, defaultFrom);
    const toDate = parseDateOrFallback(parsed.data.to, now);

    const featureFilter = parsed.data.feature;

    const rows = await prisma.orgDailyUsage.findMany({
      where: {
        orgId,
        date: {
          gte: fromDate,
          lte: toDate
        },
        ...(featureFilter ? { feature: featureFilter } : {})
      },
      orderBy: { date: 'asc' }
    });

    return reply.send({ usage: rows });
  });

  app.get(
    '/orgs/:orgId/analytics/top-users',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const orgId = (req.params as any).orgId as string;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:analytics:read'
      );

      const parsed = usageQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_QUERY', details: parsed.error.format() });
      }

      const now = new Date();
      const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fromDate = parseDateOrFallback(parsed.data.from, defaultFrom);
      const toDate = parseDateOrFallback(parsed.data.to, now);

      const raw = await prisma.orgUserDailyUsage.groupBy({
        by: ['userId'],
        where: {
          orgId,
          date: { gte: fromDate, lte: toDate }
        },
        _sum: {
          requestCount: true,
          inputTokens: true,
          outputTokens: true,
          estimatedCostMicros: true
        },
        orderBy: {
          _sum: {
            estimatedCostMicros: 'desc'
          }
        },
        take: 20
      });

      const userIds = raw.map((r) => r.userId);
      const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
      const userMap = new Map(users.map((u) => [u.id, u]));

      const result = raw.map((r) => ({
        userId: r.userId,
        user: userMap.get(r.userId)
          ? {
              id: userMap.get(r.userId)!.id,
              name: userMap.get(r.userId)!.name,
              email: userMap.get(r.userId)!.email
            }
          : null,
        requestCount: r._sum.requestCount ?? 0,
        inputTokens: r._sum.inputTokens ?? 0,
        outputTokens: r._sum.outputTokens ?? 0,
        estimatedCostMicros: r._sum.estimatedCostMicros ?? 0
      }));

      return reply.send({ topUsers: result });
    }
  );
}
