// apps/api-gateway/src/routes/tools.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { listToolsForContext, executeToolCall, executeToolEnvelope } from '../services/toolEngine';

const listQuerySchema = z.object({
  conversationId: z.string().optional(),
  orgId: z.string().optional(),
});

const executeBodySchema = z.object({
  conversationId: z.string().nullable().optional(),
  orgId: z.string().nullable().optional(),
  tool: z.string().min(1),
  args: z.unknown().optional(),
});

const executeEnvelopeBodySchema = z.object({
  conversationId: z.string().nullable().optional(),
  orgId: z.string().nullable().optional(),
  toolCalls: z
    .array(
      z.object({
        tool: z.string().min(1),
        args: z.unknown().optional(),
      }),
    )
    .min(1),
});

export default async function toolsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/tools', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQueryParams'), details: parsedQuery.error.format() });
    }

    const { conversationId, orgId } = parsedQuery.data;

    const ctx = {
      userId: payload.userId,
      orgId: orgId ?? null,
      conversationId: conversationId ?? null,
    };

    const toolsList = await listToolsForContext(ctx);
    const tools = toolsList.map((t) => ({
      name: t.name,
      description: t.description,
      argsSchema: t.argsSchema,
    }));

    return reply.send({ tools });
  });

  app.post('/tools/execute', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parsedBody = executeBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsedBody.error.format() });
    }

    const { conversationId, orgId, tool, args } = parsedBody.data;

    const ctx = {
      userId: payload.userId,
      orgId: orgId ?? null,
      conversationId: conversationId ?? null,
    };

    const result = await executeToolCall({ tool, args }, ctx);

    return reply.send(result);
  });

  app.post('/tools/execute-envelope', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parsedBody = executeEnvelopeBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsedBody.error.format() });
    }

    const { conversationId, orgId, toolCalls } = parsedBody.data;

    const ctx = {
      userId: payload.userId,
      orgId: orgId ?? null,
      conversationId: conversationId ?? null,
    };

    // Ensure args is always provided (not optional)
    const normalizedToolCalls = toolCalls.map((tc) => ({
      tool: tc.tool,
      args: tc.args ?? {},
    }));

    const results = await executeToolEnvelope({ toolCalls: normalizedToolCalls }, ctx);

    return reply.send({ results });
  });
}

