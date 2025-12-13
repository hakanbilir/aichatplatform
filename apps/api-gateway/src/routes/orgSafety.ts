// apps/api-gateway/src/routes/orgSafety.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const safetyConfigSchema = z.object({
  moderateUserMessages: z.boolean().optional(),
  moderateAssistantMessages: z.boolean().optional(),
  categoryActions: z
    .record(z.string(), z.enum(['block', 'warn', 'log_only', 'allow']))
    .optional(),
  allowedDomains: z.array(z.string().url()).optional()
});

export default async function orgSafetyRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/safety', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read'
    );

    const cfg = await prisma.orgSafetyConfig.findUnique({ where: { orgId } });
    return reply.send({ config: cfg });
  });

  app.put('/orgs/:orgId/safety', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write'
    );

    const parsed = safetyConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const cfg = await prisma.orgSafetyConfig.upsert({
      where: { orgId },
      update: {
        moderateUserMessages:
          typeof parsed.data.moderateUserMessages === 'boolean'
            ? parsed.data.moderateUserMessages
            : undefined,
        moderateAssistantMessages:
          typeof parsed.data.moderateAssistantMessages === 'boolean'
            ? parsed.data.moderateAssistantMessages
            : undefined,
        categoryActions: parsed.data.categoryActions ?? undefined,
        allowedDomains: parsed.data.allowedDomains ?? undefined
      },
      create: {
        orgId,
        moderateUserMessages: parsed.data.moderateUserMessages ?? true,
        moderateAssistantMessages: parsed.data.moderateAssistantMessages ?? false,
        categoryActions: parsed.data.categoryActions ?? {},
        allowedDomains: parsed.data.allowedDomains ?? []
      }
    });

    return reply.send({ config: cfg });
  });
}
