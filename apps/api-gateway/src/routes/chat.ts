import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { z } from 'zod';
import { ChatStreamEvent } from '@ai-chat/core-types';

import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { runConversationTurn, streamConversationTurn } from '../services/chatEngine';

const sendMessageBodySchema = z.object({
  content: z.string().min(1).max(32000), // 32KB max per message
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  images: z.array(z.string()).optional(),
});

export default async function chatRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Non-streaming message send
  app.post(
    '/conversations/:id/messages',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({ id: z.string().min(1) });
      const parseParams = paramsSchema.safeParse(request.params);
      if (!parseParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
      }
      const conversationId = parseParams.data.id;

      const parseBody = sendMessageBodySchema.safeParse(request.body);
      if (!parseBody.success) {
        return reply.code(400).send({
          error: request.i18n.t('errors.invalidMessageData'),
          details: parseBody.error.format(),
        });
      }

      const { content, model, temperature, topP, maxTokens, images } = parseBody.data;

      // Verify access rights
      // ⚡ Bolt: Removed unnecessary query for orgMemberships.
      // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
      // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
      // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load on the critical chat path.
      // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, orgId: true, userId: true },
      });

      if (!conversation) {
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      // Enforce permissions:
      // If org conversation, user must have conversation:chat permission (VIEWERs don't have it).
      // If personal conversation, user must be the owner (implicitly guaranteed by query, but explicit check adds safety).
      if (conversation.orgId) {
        await assertOrgPermission(
          { id: payload.userId, isSuperadmin: payload.isSuperadmin },
          conversation.orgId,
          'conversation:chat',
        );
      } else if (conversation.userId !== payload.userId) {
        // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      try {
        // ⚡ Bolt: Removed redundant `findMany` query after chat turn.
        // 💡 What: Modified `runConversationTurn` to return the `userMessageId`, `userContent`, and timestamps instead of re-fetching the last two messages from the database.
        // 🎯 Why: Fetching the messages immediately after they were created during the chat turn was an unnecessary database call, adding latency to every message sent.
        // 📊 Impact: Reduces database queries by 1 per message sent, improving the endpoint's response time and reducing load.
        // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
        const result = await runConversationTurn({
          conversationId: conversation.id,
          userId: payload.userId,
          content,
          images,
          overrides: {
            model,
            temperature,
            topP,
            maxTokens,
          },
        });

        return reply.send({
          conversationId: conversation.id,
          userMessage: {
            id: result.userMessageId,
            role: 'USER',
            content: result.userContent,
            createdAt: result.userCreatedAt,
          },
          assistantMessage: {
            id: result.assistantMessageId,
            role: 'ASSISTANT',
            content: result.assistantContent,
            createdAt: result.assistantCreatedAt,
          },
          usage: result.usage,
        });
      } catch (err) {
        request.log.error(err);
        return reply.code(500).send({ error: 'Chat generation failed' });
      }
    },
  );

  // Streaming message send via SSE
  app.post(
    '/conversations/:id/stream',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({ id: z.string().min(1) });
      const parseParams = paramsSchema.safeParse(request.params);
      if (!parseParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
      }
      const conversationId = parseParams.data.id;

      const parseBody = sendMessageBodySchema.safeParse(request.body);
      if (!parseBody.success) {
        return reply.code(400).send({
          error: request.i18n.t('errors.invalidMessageData'),
          details: parseBody.error.format(),
        });
      }

      const { content, model, temperature, topP, maxTokens, images } = parseBody.data;

      // Verify access rights
      // ⚡ Bolt: Removed unnecessary query for orgMemberships.
      // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
      // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
      // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load on the critical chat path.
      // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { id: true, orgId: true, userId: true },
      });

      if (!conversation) {
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      // Enforce permissions:
      // If org conversation, user must have conversation:chat permission (VIEWERs don't have it).
      // If personal conversation, user must be the owner (implicitly guaranteed by query, but explicit check adds safety).
      if (conversation.orgId) {
        await assertOrgPermission(
          { id: payload.userId, isSuperadmin: payload.isSuperadmin },
          conversation.orgId,
          'conversation:chat',
        );
      } else if (conversation.userId !== payload.userId) {
        // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
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
          images,
          overrides: {
            model,
            temperature,
            topP,
            maxTokens,
          },
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
    },
  );
}
