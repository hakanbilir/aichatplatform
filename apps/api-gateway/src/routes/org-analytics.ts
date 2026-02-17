// apps/api-gateway/src/routes/org-analytics.ts

import path from 'path';
import { Worker } from 'worker_threads';

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { z } from 'zod';

import { JwtPayload } from '../auth/types';
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

    // Offload CPU-heavy aggregation to worker
    const isDev = process.env.NODE_ENV !== 'production';
    const workerRelPath = isDev ? 'src/workers/token-aggregation.worker.ts' : 'dist/workers/token-aggregation.worker.js';
    const workerPath = path.join(process.cwd(), workerRelPath);

    const { totals, completions, firstMessageAt, lastMessageAt, byDay, byModel } = await new Promise<any>((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: { messages },
        execArgv: isDev ? ['--import', 'tsx/esm'] : undefined
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    });

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

  // SSE Kinetic Streaming Analytics Endpoint (Full Data)
  app.get('/orgs/:orgId/analytics/kinetic-stream', { preHandler: [app.authenticate] }, async (request, reply) => {
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

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Notify client of processing
    reply.raw.write(`data: "processing"\n\n`);

    try {
      // Offload to worker thread for Kinetic performance
      // Use process.cwd() to resolve worker path for both dev (TS) and prod (JS)
      const isDev = process.env.NODE_ENV !== 'production';
      const workerRelPath = isDev ? 'src/workers/analytics.worker.ts' : 'dist/workers/analytics.worker.js';
      const workerPath = path.join(process.cwd(), workerRelPath);

      const worker = new Worker(workerPath, {
        workerData: {
          orgId,
          windowDays: parsedQuery.data.windowDays
        },
        // Ensure we can run TS files if we are in dev mode
        execArgv: isDev ? ['--import', 'tsx/esm'] : undefined
      });

      worker.on('message', (result) => {
        if (result.error) {
           reply.raw.write(`event: error\ndata: ${JSON.stringify(result)}\n\n`);
        } else {
           reply.raw.write(`data: ${JSON.stringify(result)}\n\n`);
        }
        reply.raw.end();
      });

      worker.on('error', (err) => {
        request.log.error(err, 'Worker error');
        reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
        reply.raw.end();
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
           request.log.error(`Worker stopped with exit code ${code}`);
           if (!reply.raw.writableEnded) {
               reply.raw.end();
           }
        }
      });

    } catch (err) {
      request.log.error(err, 'Streaming analytics error');
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (err as Error).message })}\n\n`);
      reply.raw.end();
    }

    return new Promise(() => {}); // Keep connection open until worker finishes
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

