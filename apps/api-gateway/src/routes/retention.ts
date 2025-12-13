// apps/api-gateway/src/routes/retention.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { prisma } from '@ai-chat/db';

const retentionBodySchema = z.object({
  retentionDays: z.number().int().min(1).max(3650).nullable().optional(), // Maps to conversationRetentionDays
  messageRetentionDays: z.number().int().min(1).max(3650).nullable().optional(),
  fileRetentionDays: z.number().int().min(1).max(3650).nullable().optional(),
  autoDeleteEnabled: z.boolean().optional()
});

export default async function retentionRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/orgs/:orgId/retention', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read'
    );

    const cfg = await prisma.orgDataRetentionConfig.findUnique({ where: { orgId } });
    return reply.send({ config: cfg });
  });

  app.put('/orgs/:orgId/retention', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write'
    );

    const parsed = retentionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const cfg = await prisma.orgDataRetentionConfig.upsert({
      where: { orgId },
      update: {
        conversationRetentionDays: parsed.data.retentionDays ?? undefined,
        messageRetentionDays: parsed.data.messageRetentionDays ?? undefined,
        fileRetentionDays: parsed.data.fileRetentionDays ?? undefined,
        autoDeleteEnabled: parsed.data.autoDeleteEnabled ?? undefined
      },
      create: {
        orgId,
        conversationRetentionDays: parsed.data.retentionDays ?? null,
        messageRetentionDays: parsed.data.messageRetentionDays ?? null,
        fileRetentionDays: parsed.data.fileRetentionDays ?? null,
        autoDeleteEnabled: parsed.data.autoDeleteEnabled ?? false
      }
    });

    return reply.send({ config: cfg });
  });
}

