// apps/api-gateway/src/routes/scimUsers.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { z } from 'zod';
import { validateScimBearerToken } from '../scim/scimAuth';
import { createUserFromScim, updateUserFromScim, deleteUserFromScim } from '../scim/scimService';

const scimParamsSchema = z.object({
  orgSlug: z.string().min(1),
});

const scimUserParamsSchema = z.object({
  orgSlug: z.string().min(1),
  userId: z.string().min(1),
});

const scimQuerySchema = z.object({
  filter: z.string().optional(),
  startIndex: z.string().regex(/^\d+$/).optional().default('1'),
  count: z.string().regex(/^\d+$/).optional().default('100'),
});

export default async function scimUsersRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // SCIM 2.0 /Users endpoint
  app.get('/scim/:orgSlug/v2/Users', async (req, reply) => {
    const paramsParse = scimParamsSchema.safeParse(req.params);
    if (!paramsParse.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', details: paramsParse.error.format() });
    }
    const { orgSlug } = paramsParse.data;

    const queryParse = scimQuerySchema.safeParse(req.query);
    if (!queryParse.success) {
       return reply.code(400).send({ error: 'INVALID_QUERY', details: queryParse.error.format() });
    }
    const { filter, startIndex: startIndexStr, count: countStr } = queryParse.data;

    const auth = await validateScimBearerToken(req);
    if (!auth) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || org.id !== auth.orgId) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    // Filter parameter reserved for future SCIM filtering support
    void filter; // Suppress unused variable warning

    const startIndex = parseInt(startIndexStr, 10);
    const count = parseInt(countStr, 10);

    // Simplified: list all org members
    const members = await prisma.orgMember.findMany({
      where: { orgId: auth.orgId },
      include: { user: true },
      skip: startIndex - 1,
      take: count
    });

    const resources = members.map((m) => ({
      id: m.user.id,
      userName: m.user.email,
      name: {
        formatted: m.user.name || m.user.email
      },
      emails: [{ value: m.user.email, primary: true }],
      active: !m.isDisabled
    }));

    return reply.send({
      totalResults: members.length,
      startIndex,
      itemsPerPage: count,
      Resources: resources
    });
  });

  app.post('/scim/:orgSlug/v2/Users', async (req, reply) => {
    const paramsParse = scimParamsSchema.safeParse(req.params);
    if (!paramsParse.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', details: paramsParse.error.format() });
    }
    const { orgSlug } = paramsParse.data;

    const auth = await validateScimBearerToken(req);
    if (!auth) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || org.id !== auth.orgId) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    const scimUser = req.body as any;

    try {
      const user = await createUserFromScim(auth.orgId, scimUser, auth.connectionId);

      return reply.code(201).send({
        id: user.id,
        userName: user.email,
        name: {
          formatted: user.name || user.email
        },
        emails: [{ value: user.email, primary: true }],
        active: true
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.put('/scim/:orgSlug/v2/Users/:userId', async (req, reply) => {
    const paramsParse = scimUserParamsSchema.safeParse(req.params);
    if (!paramsParse.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', details: paramsParse.error.format() });
    }
    const { orgSlug, userId } = paramsParse.data;

    const auth = await validateScimBearerToken(req);
    if (!auth) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || org.id !== auth.orgId) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    const scimUser = req.body as any;

    try {
      await updateUserFromScim(auth.orgId, userId, scimUser, auth.connectionId);
      return reply.send({ ok: true });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.delete('/scim/:orgSlug/v2/Users/:userId', async (req, reply) => {
    const paramsParse = scimUserParamsSchema.safeParse(req.params);
    if (!paramsParse.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', details: paramsParse.error.format() });
    }
    const { orgSlug, userId } = paramsParse.data;

    const auth = await validateScimBearerToken(req);
    if (!auth) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || org.id !== auth.orgId) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    try {
      await deleteUserFromScim(auth.orgId, userId, auth.connectionId);
      return reply.code(204).send();
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
