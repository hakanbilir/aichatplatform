// apps/api-gateway/src/routes/search.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';

import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { searchConversations } from '../search/service';
import { ConversationSearchRequest } from '../search/types';
import { setSSEHeaders, sendSSEEvent } from '../utils/sse';

const searchBodySchema = z.object({
  query: z.string().default(''),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(50).default(20),
  sort: z.enum(['recent', 'relevance']).default('recent'),
  stream: z.boolean().optional(),
  filters: z
    .object({
      modelIds: z.array(z.string()).optional(),
      createdByUserIds: z.array(z.string()).optional(),
      createdAfter: z.string().optional(),
      createdBefore: z.string().optional(),
      hasTools: z.boolean().optional(),
      hasRag: z.boolean().optional(),
      hasFiles: z.boolean().optional()
    })
    .optional()
});

export default async function searchRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/orgs/:orgId/search', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:read'
    );

    const parsed = searchBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const body = parsed.data;

    const reqDto: ConversationSearchRequest = {
      orgId,
      query: body.query,
      page: body.page,
      pageSize: body.pageSize,
      sort: body.sort,
      filters: body.filters
    };

    const result = await searchConversations(reqDto);

    if (body.stream) {
      setSSEHeaders(reply);

      // Send metadata
      sendSSEEvent(reply, { total: result.total, page: result.page, pageSize: result.pageSize }, 'meta');

      // Send hits one by one to simulate streaming flow
      for (const hit of result.hits) {
        sendSSEEvent(reply, hit, 'hit');
        // Small delay to make the UI "feel" streamed (optional, but requested by "Kinetic" theme)
        // In a real implementation, this would happen naturally as data is fetched.
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      sendSSEEvent(reply, {}, 'done');
      return reply.raw.end();
    }

    return reply.send(result);
  });
}
