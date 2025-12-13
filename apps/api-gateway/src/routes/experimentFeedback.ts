// apps/api-gateway/src/routes/experimentFeedback.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const feedbackSchema = z.object({
  thumbsUp: z.boolean().optional(),
  note: z.string().optional()
});

const scoreSchema = z.object({
  metricKey: z.string().min(1),
  value: z.number(),
  note: z.string().optional()
});

export default async function experimentFeedbackRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // Manual thumbs + note
  app.post(
    '/orgs/:orgId/experiments/runs/:runId/feedback',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, runId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:experiments:write'
      );

      const parsed = feedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const run = await prisma.experimentRun.findFirst({
        where: { id: runId, experiment: { orgId } },
        include: { experiment: true }
      });

      if (!run) {
        return reply.code(404).send({ error: 'RUN_NOT_FOUND' });
      }

      await prisma.experimentRun.update({
        where: { id: runId },
        data: {
          thumbsUp: parsed.data.thumbsUp ?? run.thumbsUp,
          feedbackNote: parsed.data.note ?? run.feedbackNote
        }
      });

      return reply.send({ ok: true });
    }
  );

  // Add numeric score (will create metric definition if not exists)
  app.post(
    '/orgs/:orgId/experiments/runs/:runId/scores',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, runId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:experiments:write'
      );

      const parsed = scoreSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const run = await prisma.experimentRun.findFirst({
        where: { id: runId, experiment: { orgId } },
        include: { experiment: true }
      });

      if (!run) {
        return reply.code(404).send({ error: 'RUN_NOT_FOUND' });
      }

      let metric = await prisma.evalMetricDefinition.findFirst({
        where: { orgId, key: parsed.data.metricKey }
      });

      if (!metric) {
        metric = await prisma.evalMetricDefinition.create({
          data: {
            orgId,
            key: parsed.data.metricKey,
            name: parsed.data.metricKey,
            scale: 'custom',
            createdById: payload.userId
          }
        });
      }

      const score = await prisma.evalScore.create({
        data: {
          runId: run.id,
          metricId: metric.id,
          value: parsed.data.value,
          note: parsed.data.note ?? null
        }
      });

      return reply.code(201).send({ score });
    }
  );
}
