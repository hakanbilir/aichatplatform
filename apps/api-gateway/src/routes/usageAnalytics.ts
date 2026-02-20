// apps/api-gateway/src/routes/usageAnalytics.ts

import { Worker } from 'worker_threads';
import path from 'path';

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
  // Kinetic Streaming Endpoint (2026 Standard): Uses SSE + Workers
  app.get('/orgs/:orgId/analytics/stream', { preHandler: [app.authenticate] }, async (req, reply) => {
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
    const featureFilter = parsed.data.feature;

    const rows = await prisma.orgDailyUsage.findMany({
      where: {
        orgId,
        date: { gte: fromDate, lte: toDate },
        ...(featureFilter ? { feature: featureFilter } : {})
      },
      orderBy: { date: 'asc' }
    });

    // Initialize SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    // Simulate kinetic loading state
    reply.raw.write(`data: "processing"\n\n`);

    // Use Worker for aggregation (CPU-bound offloading)
    // resolve path relative to process.cwd() to support both dev (ts) and prod (js)
    // without relying on __dirname (ESM incompatible) or import.meta (CJS incompatible)
    const isDev = process.env.NODE_ENV !== 'production';
    const workerRelPath = isDev ? 'src/workers/usage-worker.ts' : 'dist/workers/usage-worker.js';
    const workerPath = path.join(process.cwd(), workerRelPath);

    try {
      const worker = new Worker(workerPath, {
        workerData: { rows },
        // execArgv required for tsx to handle .ts files in worker
        execArgv: isDev ? ['--import', 'tsx/esm'] : undefined
      });

      const totals = await new Promise((resolve, reject) => {
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
      });

      const period = {
        startDate: fromDate.toISOString(),
        endDate: toDate.toISOString(),
      };

      // Send final payload
      reply.raw.write(`data: ${JSON.stringify({ usage: rows, totals, period })}\n\n`);
    } catch (err) {
      console.error('Worker error:', err);
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'Aggregation failed' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // Kinetic Top Users Streaming Endpoint
  app.get('/orgs/:orgId/analytics/top-users/stream', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:analytics:read'
    );

    const parsed = usageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      reply.raw.writeHead(400);
      reply.raw.write(`data: ${JSON.stringify({ error: 'INVALID_QUERY' })}\n\n`);
      reply.raw.end();
      return;
    }

    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromDate = parseDateOrFallback(parsed.data.from, defaultFrom);
    const toDate = parseDateOrFallback(parsed.data.to, now);

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    reply.raw.write(`data: "processing"\n\n`);

    try {
      // Simulate kinetic computation delay (optional, but requested for feel)
      // await new Promise(r => setTimeout(r, 300));

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

      reply.raw.write(`data: ${JSON.stringify({ topUsers: result })}\n\n`);
    } catch (err) {
      console.error('Streaming error:', err);
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'Internal Server Error' })}\n\n`);
    } finally {
      reply.raw.end();
    }
  });

  // Keep original endpoint for backward compatibility (or if needed by other consumers)
  app.get('/orgs/:orgId/analytics/usage', { preHandler: [app.authenticate] }, async (req, reply) => {
    // ... logic duplicated effectively, but leaving as is per instructions to refactor "controllers"
    // Since I added the streaming one which the frontend now uses, this is technically "refactoring the feature"
    // But I'll leave this here to avoid breaking other unknown clients.

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

    const totals = {
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCostMicros: 0,
    };

    for (const row of rows) {
      totals.requestCount += row.requestCount;
      totals.inputTokens += row.inputTokens;
      totals.outputTokens += row.outputTokens;
      totals.estimatedCostMicros += row.estimatedCostMicros;
    }

    const period = {
      startDate: fromDate.toISOString(),
      endDate: toDate.toISOString(),
    };

    return reply.send({ usage: rows, totals, period });
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
