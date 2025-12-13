// apps/api-gateway/src/routes/orgSsoConnections.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const createConnectionSchema = z.object({
  type: z.enum(['saml', 'oidc']),
  name: z.string().min(1).max(128),
  isEnabled: z.boolean().optional(),
  enableJitProvisioning: z.boolean().optional(),
  config: z.record(z.any())
});

export default async function orgSsoConnectionsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/sso-connections', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read' // Use existing permission
    );

    const connections = await prisma.ssoConnection.findMany({ where: { orgId } });
    return reply.send({ connections });
  });

  app.post('/orgs/:orgId/sso-connections', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write' // Use existing permission
    );

    const parsed = createConnectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const connection = await prisma.ssoConnection.create({
      data: {
        orgId,
        type: parsed.data.type,
        name: parsed.data.name,
        isEnabled: parsed.data.isEnabled ?? false,
        enableJitProvisioning: parsed.data.enableJitProvisioning ?? true,
        config: parsed.data.config
      }
    });

    return reply.code(201).send({ connection });
  });
}
