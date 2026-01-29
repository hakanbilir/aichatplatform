import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { ChatStreamEvent } from '@ai-chat/core-types';
import { runConversationTurn, streamConversationTurn } from '../services/chatEngine';

const sendMessageBodySchema = z.object({
  content: z.string().min(1).max(32000), // 32KB max per message
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
});

export default async function chatRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Non-streaming message send
  app.post('/conversations/:id/messages', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }
    const conversationId = parseParams.data.id;

    const parseBody = sendMessageBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidMessageData'), details: parseBody.error.format() });
    }

    const { content, model, temperature, topP, maxTokens } = parseBody.data;

    // Verify access rights
    const memberships = await prisma.orgMember.findMany({
      where: { userId: payload.userId },
      select: { orgId: true },
    });
    const orgIds = memberships.map((m: { orgId: string }) => m.orgId);

    const orConditions: any[] = [{ userId: payload.userId }];
    if (orgIds.length > 0) {
      orConditions.push({ orgId: { in: orgIds } });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: orConditions,
      },
      select: { id: true }
    });

    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    try {
      const result = await runConversationTurn({
        conversationId: conversation.id,
        userId: payload.userId,
        content,
        overrides: {
          model,
          temperature,
          topP,
          maxTokens
        }
      });

      // Fetch the created messages to return them in expected format
      // Note: This is slightly inefficient but ensures consistency with old API response format
      const messages = await prisma.message.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      const assistantMessage = messages.find(m => m.role === 'ASSISTANT');
      const userMessage = messages.find(m => m.role === 'USER');

      return reply.send({
        conversationId: conversation.id,
        userMessage: userMessage ? {
          id: userMessage.id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        } : undefined,
        assistantMessage: assistantMessage ? {
          id: assistantMessage.id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
        } : undefined,
        usage: result.usage,
      });

    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: 'Chat generation failed' });
    }
  });

  // Streaming message send via SSE
  app.post('/conversations/:id/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }
    const conversationId = parseParams.data.id;

    const parseBody = sendMessageBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidMessageData'), details: parseBody.error.format() });
    }

    const { content, model, temperature, topP, maxTokens } = parseBody.data;

    // Verify access rights
    const memberships = await prisma.orgMember.findMany({
      where: { userId: payload.userId },
      select: { orgId: true },
    });
    const orgIds = memberships.map((m: { orgId: string }) => m.orgId);

    const orConditions: any[] = [{ userId: payload.userId }];
    if (orgIds.length > 0) {
      orConditions.push({ orgId: { in: orgIds } });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: orConditions,
      },
      select: { id: true }
    });

    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    // Set up SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders?.();

    const sendEvent = (event: unknown) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const abortController = new AbortController();

    request.raw.on('close', () => {
      abortController.abort();
    });

    try {
      const generator = streamConversationTurn({
        conversationId: conversation.id,
        userId: payload.userId,
        content,
        overrides: {
          model,
          temperature,
          topP,
          maxTokens
        }
      });

      for await (const event of generator) {
        // Just forward the event from chatEngine
        sendEvent(event as ChatStreamEvent);
      }

      reply.raw.end();
    } catch (err) {
      request.log.error(err);
      try {
        sendEvent({ type: 'error', error: (err as Error).message });
        reply.raw.end();
      } catch {
        // Ignore if connection already closed
      }
    }
  });
}
