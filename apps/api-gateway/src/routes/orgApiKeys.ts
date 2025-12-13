// apps/api-gateway/src/routes/orgApiKeys.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { generateOrgApiKey } from '../apiKeys/utils';
import { writeAuditLog } from '../services/audit';

const createKeySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional()
});

const updateKeySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional(),
  scopes: z.array(z.string()).min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

export default async function orgApiKeysRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List keys (no secret)
  app.get('/orgs/:orgId/admin/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:api-keys:read'
    );

    const keys = await prisma.orgApiKey.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      keys: keys.map((k: { id: string; name: string; createdAt: Date; expiresAt: Date | null; isActive: boolean }) => ({
        id: k.id,
        name: k.name,
        description: null, // Description not in schema
        scopes: [], // Scopes not in schema
        isActive: k.isActive,
        createdAt: k.createdAt.toISOString(),
        expiresAt: k.expiresAt ? k.expiresAt.toISOString() : null
      }))
    });
  });

  // Create key (returns raw token once)
  app.post('/orgs/:orgId/admin/api-keys', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:api-keys:write'
    );

    const parsed = createKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const { raw, hash } = generateOrgApiKey(orgId);

    const key = await prisma.orgApiKey.create({
      data: {
        orgId,
        createdById: payload.userId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
        hash,
        isActive: true
      }
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'org.api_key_created',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { keyId: key.id, name: parsed.data.name }
    });

    return reply.code(201).send({
      id: key.id,
      token: raw // show only once
    });
  });

  // Update key metadata / status
  app.patch('/orgs/:orgId/admin/api-keys/:keyId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, keyId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:api-keys:write'
    );

    const parsed = updateKeySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    await prisma.orgApiKey.updateMany({
      where: { id: keyId, orgId },
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        scopes: parsed.data.scopes,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : undefined,
        isActive: parsed.data.isActive
      }
    });

    return reply.send({ ok: true });
  });

  // Delete key
  app.delete('/orgs/:orgId/admin/api-keys/:keyId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, keyId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:api-keys:write'
    );

    const deleted = await prisma.orgApiKey.deleteMany({ where: { id: keyId, orgId } });

    if (deleted.count > 0) {
      await writeAuditLog({
        orgId,
        user: payload,
        action: 'org.api_key_deleted',
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        metadata: { keyId }
      });
    }

    return reply.send({ ok: true });
  });
}

