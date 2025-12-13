// apps/api-gateway/src/routes/experiments.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const createExperimentSchema = z.object({
  name: z.string().min(1).max(256),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const addVariantSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().optional(),
  chatProfileId: z.string().optional(),
  systemPrompt: z.string().optional(),
  config: z.record(z.any()).optional()
});

const addInputsSchema = z.object({
  inputs: z.array(
    z.object({
      key: z.string().min(1),
      content: z.string().min(1),
      metadata: z.record(z.any()).optional()
    })
  )
});

export default async function experimentsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // List experiments
  app.get('/orgs/:orgId/experiments', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:experiments:read'
    );

    const experiments = await prisma.experiment.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        variants: true,
        inputs: true,
        runs: true
      }
    });

    return reply.send({ experiments });
  });

  // Create experiment
  app.post('/orgs/:orgId/experiments', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:experiments:write'
    );

    const parsed = createExperimentSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const exp = await prisma.experiment.create({
      data: {
        orgId,
        createdById: payload.userId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        metadata: parsed.data.metadata ?? {}
      }
    });

    // Optional: emitEvent('experiment.created', ...)

    return reply.code(201).send({ experiment: exp });
  });

  // Add variant
  app.post(
    '/orgs/:orgId/experiments/:experimentId/variants',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, experimentId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:experiments:write'
      );

      const parsed = addVariantSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const v = await prisma.experimentVariant.create({
        data: {
          experimentId,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          chatProfileId: parsed.data.chatProfileId ?? null,
          systemPrompt: parsed.data.systemPrompt ?? null,
          config: parsed.data.config ?? {},
          createdById: payload.userId
        }
      });

      return reply.code(201).send({ variant: v });
    }
  );

  // Add inputs
  app.post(
    '/orgs/:orgId/experiments/:experimentId/inputs',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, experimentId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:experiments:write'
      );

      const parsed = addInputsSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      await prisma.experimentInput.createMany({
        data: parsed.data.inputs.map((i) => ({
          experimentId,
          key: i.key,
          content: i.content,
          metadata: i.metadata ?? {},
          createdById: payload.userId
        }))
      });

      return reply.code(201).send({ ok: true });
    }
  );
}
