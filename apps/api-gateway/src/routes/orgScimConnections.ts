// apps/api-gateway/src/routes/orgScimConnections.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import crypto from 'crypto';

const createConnectionSchema = z.object({
  name: z.string().min(1).max(128),
  isEnabled: z.boolean().optional()
});

export default async function orgScimConnectionsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/scim-connection', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read' // Use existing permission
    );

    const connection = await prisma.scimConnection.findFirst({ where: { orgId } });
    return reply.send({ connection });
  });

  app.post('/orgs/:orgId/scim-connection', { preHandler: [app.authenticate] }, async (req, reply) => {
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

    const bearerToken = crypto.randomBytes(32).toString('hex');

    const connection = await prisma.scimConnection.create({
      data: {
        orgId,
        name: parsed.data.name,
        bearerToken,
        isEnabled: parsed.data.isEnabled ?? false
      }
    });

    return reply.code(201).send({
      connection: {
        id: connection.id,
        name: connection.name,
        bearerToken, // Only shown once
        isEnabled: connection.isEnabled
      }
    });
  });

  app.post(
    '/orgs/:orgId/scim-connection/rotate-token',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const orgId = (req.params as any).orgId as string;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:scim:write'
      );

      const connection = await prisma.scimConnection.findFirst({ where: { orgId } });
      if (!connection) {
        return reply.code(404).send({ error: 'SCIM_CONNECTION_NOT_FOUND' });
      }

      const newToken = crypto.randomBytes(32).toString('hex');

      await prisma.scimConnection.update({
        where: { id: connection.id },
        data: { bearerToken: newToken }
      });

      return reply.send({ bearerToken: newToken });
    }
  );
}
