// apps/api-gateway/src/routes/knowledge.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { createSpace, listSpaces } from '../services/knowledgeSpaces';
import { ingestDocumentFromText } from '../services/knowledgeIngestion';
import { retrieveRelevantChunks } from '../services/knowledgeRetrieval';

const createSpaceBodySchema = z.object({
  name: z.string().min(1).max(128)
});

const ingestBodySchema = z.object({
  spaceId: z.string().min(1),
  title: z.string().min(1).max(256),
  text: z.string().min(1)
});

const retrieveQuerySchema = z.object({
  spaceId: z.string().optional(),
  query: z.string().min(1),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : undefined))
    .refine((val) => !val || !Number.isNaN(val), { message: 'limit must be a number' })
});

export default async function knowledgeRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List spaces
  app.get('/orgs/:orgId/knowledge/spaces', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'conversation:read' // Using existing permission
    );

    const spaces = await listSpaces(orgId);
    return reply.send({ spaces });
  });

  // Create space
  app.post('/orgs/:orgId/knowledge/spaces', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:update' // Using existing permission
    );

    const parsed = createSpaceBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const space = await createSpace(orgId, parsed.data.name);
    return reply.code(201).send(space);
  });

  // Ingest text
  app.post('/orgs/:orgId/knowledge/documents:text', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'conversation:write' // Using existing permission
    );

    const parsed = ingestBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const { spaceId, title, text } = parsed.data;

    const result = await ingestDocumentFromText({
      orgId,
      spaceId,
      title,
      text,
      sourceType: 'api'
    });

    return reply.code(202).send(result);
  });

  // Test retrieval endpoint
  app.get('/orgs/:orgId/knowledge/retrieve', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'conversation:read' // Using existing permission
    );

    const parsed = retrieveQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQueryParams'), details: parsed.error.format() });
    }

    const chunks = await retrieveRelevantChunks({
      orgId,
      spaceId: parsed.data.spaceId ?? null,
      query: parsed.data.query,
      limit: parsed.data.limit
    });

    return reply.send({ chunks });
  });
}

