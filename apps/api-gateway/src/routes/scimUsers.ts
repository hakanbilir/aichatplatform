// apps/api-gateway/src/routes/scimUsers.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { validateScimBearerToken } from '../scim/scimAuth';
import { createUserFromScim, updateUserFromScim, deleteUserFromScim } from '../scim/scimService';

export default async function scimUsersRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // SCIM 2.0 /Users endpoint
  app.get('/scim/:orgSlug/v2/Users', async (req, reply) => {
    const { orgSlug } = req.params as any;
    const auth = await validateScimBearerToken(req);
    if (!auth) {
      return reply.code(401).send({ error: 'UNAUTHORIZED' });
    }

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org || org.id !== auth.orgId) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    // Filter parameter reserved for future SCIM filtering support
    // @ts-ignore - intentionally unused, reserved for future use
    const _filter = (req.query as any).filter;
    void _filter; // Suppress unused variable warning
    const startIndex = parseInt((req.query as any).startIndex || '1', 10);
    const count = parseInt((req.query as any).count || '100', 10);

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
    const { orgSlug } = req.params as any;
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
    const { orgSlug, userId } = req.params as any;
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
    const { orgSlug, userId } = req.params as any;
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
