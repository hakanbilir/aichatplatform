// apps/api-gateway/src/routes/moderationIncidents.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const incidentsQuerySchema = z.object({
  page: z.string().optional(),
  pageSize: z.string().optional(),
  source: z.enum(['user', 'assistant', 'tool']).optional(),
  severeOnly: z.string().optional()
});

export default async function moderationIncidentsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get(
    '/orgs/:orgId/safety/incidents',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;
      const { orgId } = request.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:safety:read'
      );

      const parsed = incidentsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_QUERY', details: parsed.error.format() });
      }

      const page = parsed.data.page ? parseInt(parsed.data.page, 10) || 1 : 1;
      const pageSize = parsed.data.pageSize ? parseInt(parsed.data.pageSize, 10) || 50 : 50;

      const where: any = { orgId };

      if (parsed.data.source) {
        where.source = parsed.data.source;
      }

      if (parsed.data.severeOnly === 'true') {
        where.isSevere = true;
      }

      const [items, total] = await Promise.all([
        prisma.moderationIncident.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize
        }),
        prisma.moderationIncident.count({ where })
      ]);

      return reply.send({
        items,
        page,
        pageSize,
        total
      });
    }
  );
}
