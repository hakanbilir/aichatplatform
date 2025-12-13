// apps/api-gateway/src/routes/orgIntegrations.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import {
  createOrgIntegration,
  deleteOrgIntegration,
  listOrgIntegrations,
  updateOrgIntegration,
} from '../services/orgIntegrations';

const createBodySchema = z.object({
  providerKey: z.enum(['generic-webhook', 'slack', 'teams', 'internal-http']),
  name: z.string().min(1).max(128),
  credentials: z.unknown(),
  config: z.unknown().optional(),
});

const updateBodySchema = z.object({
  name: z.string().min(1).max(128).optional(),
  isEnabled: z.boolean().optional(),
  config: z.unknown().optional(),
});

export default async function orgIntegrationsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  app.get('/orgs/:orgId/integrations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }
    const orgId = parsedParams.data.orgId;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:update',
    );

    const integrations = await listOrgIntegrations(orgId);
    return reply.send({ integrations });
  });

  app.post('/orgs/:orgId/integrations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }
    const orgId = parsedParams.data.orgId;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:update',
    );

    const parsed = createBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const integration = await createOrgIntegration({
      orgId,
      providerKey: parsed.data.providerKey,
      name: parsed.data.name,
      credentials: parsed.data.credentials,
      config: parsed.data.config,
    });

    return reply.code(201).send({ integration });
  });

  app.patch(
    '/orgs/:orgId/integrations/:integrationId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;
      const paramsSchema = z.object({
        orgId: z.string().min(1),
        integrationId: z.string().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidParams') });
      }
      const { orgId, integrationId } = parsedParams.data;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:update',
      );

      const parsed = updateBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
      }

      await updateOrgIntegration(orgId, integrationId, parsed.data);

      return reply.send({ ok: true });
    },
  );

  app.delete(
    '/orgs/:orgId/integrations/:integrationId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;
      const paramsSchema = z.object({
        orgId: z.string().min(1),
        integrationId: z.string().min(1),
      });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidParams') });
      }
      const { orgId, integrationId } = parsedParams.data;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:update',
      );

      await deleteOrgIntegration(orgId, integrationId);

      return reply.send({ ok: true });
    },
  );
}

