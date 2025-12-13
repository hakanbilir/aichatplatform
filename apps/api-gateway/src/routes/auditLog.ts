// apps/api-gateway/src/routes/auditLog.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { prisma } from '@ai-chat/db';

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  type: z.string().optional(),
  userId: z.string().optional(),
  conversationId: z.string().optional()
});

export default async function auditLogRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/orgs/:orgId/audit-log', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:audit:read'
    );

    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQueryParams'), details: parsed.error.format() });
    }

    const { page, pageSize, type, userId, conversationId } = parsed.data;

    const where: any = { orgId };

    if (type) where.type = type;
    if (userId) where.userId = userId;
    if (conversationId) where.conversationId = conversationId;

    const [total, events] = await Promise.all([
      prisma.event.count({ where }),
      prisma.event.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * pageSize,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          }
        }
      })
    ]);

    return reply.send({
      total,
      page,
      pageSize,
      events: events.map((ev: { id: string; createdAt: Date; type: string; metadata: unknown; user: { id: string; email: string; name: string | null } | null; conversationId: string | null; messageId: string | null }) => ({
        id: ev.id,
        createdAt: ev.createdAt.toISOString(),
        type: ev.type,
        user: ev.user
          ? {
              id: ev.user.id,
              email: ev.user.email,
              displayName: ev.user.name || ev.user.email
            }
          : null,
        conversationId: ev.conversationId,
        messageId: ev.messageId,
        metadata: ev.metadata
      }))
    });
  });
}

