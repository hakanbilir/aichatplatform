import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { z } from 'zod';

import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { emitEvent } from '../events/emitter';
import { renderSystemPromptFromProfile } from '../promptStudio/render';
import { resolveModelForOrg } from '../llm/modelRegistryService';
import { localEmitter } from '../events/localEmitter';

const createConversationBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  systemPrompt: z.string().max(8000).optional(),
  model: z.string().max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  chatProfileId: z.string().optional(), // Optional ChatProfile ID (42.md)
});

const updateConversationBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  systemPrompt: z.string().max(8000).nullable().optional(),
  model: z.string().max(200).nullable().optional(),
  temperature: z.number().min(0).max(2).nullable().optional(),
  topP: z.number().min(0).max(1).nullable().optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  kbConfig: z.any().optional(), // JSON field for knowledge base config (RAG settings)
  chatProfileId: z.string().nullable().optional(), // Optional ChatProfile ID (42.md)
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return 20;
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 20;
      if (n > 100) return 100;
      return Math.round(n);
    }),
  cursor: z.string().optional(),
});

const listPersonalQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return 100;
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return 100;
      if (n > 100) return 100;
      return Math.round(n);
    }),
});

const createOrgConversationBodySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(200).optional(),
  chatProfileId: z.string().optional(), // Optional ChatProfile ID (42.md)
});

async function getUserOrgIds(userId: string): Promise<string[]> {
  const memberships = await prisma.orgMember.findMany({
    where: { userId },
    select: { orgId: true },
  });
  return memberships.map((r: { orgId: string }) => r.orgId);
}

export default async function conversationsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Real-time updates for conversations (SSE)
  // Konuşmalar için gerçek zamanlı güncellemeler (SSE)
  app.get('/conversations/stream', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const sendEvent = (data: any) => {
      if (!reply.raw.writableEnded) {
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    // Heartbeat to keep connection alive
    const interval = setInterval(() => {
      sendEvent({ type: 'heartbeat', timestamp: new Date().toISOString() });
    }, 30000);

    const handleEvent = (event: any) => {
      // Filter events visible to this user
      // Bu kullanıcı tarafından görülebilen olayları filtrele
      const isOwner = event.context?.userId === payload.userId;
      const isOrgMember = event.context?.orgId && payload.orgId === event.context.orgId; // Simplified check

      if (isOwner || isOrgMember) {
        sendEvent(event);
      }
    };

    localEmitter.on('event', handleEvent);

    return new Promise<void>((resolve) => {
      request.raw.on('close', () => {
        clearInterval(interval);
        localEmitter.off('event', handleEvent);
        resolve();
      });
    }); // Keep connection open
  });

  // List conversations for an org (non-archived by default)
  app.get(
    '/orgs/:orgId/conversations',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({ orgId: z.string().min(1) });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
      }
      const orgId = parsedParams.data.orgId;

      const parsedQuery = listQuerySchema.safeParse(request.query);
      if (!parsedQuery.success) {
        return reply.code(400).send({
          error: request.i18n.t('errors.invalidQuery'),
          details: parsedQuery.error.format(),
        });
      }

      const { search, limit, cursor } = parsedQuery.data;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'conversation:chat',
      );

      const whereClause: any = {
        orgId,
        archivedAt: null,
      };

      if (search && search.trim()) {
        whereClause.title = {
          contains: search.trim(),
          mode: 'insensitive',
        };
      }

      const conversations = await prisma.conversation.findMany({
        where: whereClause,
        orderBy: [{ pinned: 'desc' }, { lastActivityAt: 'desc' }],
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        select: {
          id: true,
          title: true,
          model: true,
          pinned: true,
          archivedAt: true,
          lastActivityAt: true,
          createdAt: true,
        },
      });

      let nextCursor: string | null = null;
      let items = conversations;

      if (conversations.length > limit) {
        const last = conversations[conversations.length - 1];
        nextCursor = last.id;
        items = conversations.slice(0, limit);
      }

      return reply.send({
        items,
        nextCursor,
      });
    },
  );

  // Create a new conversation in an org
  app.post(
    '/orgs/:orgId/conversations',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({ orgId: z.string().min(1) });
      const parsedParams = paramsSchema.safeParse(request.params);
      if (!parsedParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
      }
      const orgId = parsedParams.data.orgId;

      const parsedBody = createOrgConversationBodySchema.safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: request.i18n.t('errors.validationError'),
          details: parsedBody.error.format(),
        });
      }

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'conversation:chat',
      );

      const { title, model, chatProfileId } = parsedBody.data;

      // If chatProfileId is provided, load profile and use its config (42.md)
      // chatProfileId sağlanmışsa, profili yükle ve yapılandırmasını kullan (42.md)
      let effectiveModel = model && model.trim() ? model.trim() : 'llama3.1';
      let effectiveTemperature: number | undefined = undefined;
      let effectiveTopP: number | undefined = undefined;
      // effectiveMaxTokens is not currently used but kept for future use
      let _effectiveMaxTokens: number | null | undefined = undefined;
      void _effectiveMaxTokens; // Suppress unused variable warning
      let effectiveSystemPrompt: string | null | undefined = undefined;
      const effectiveChatProfileId: string | null = chatProfileId ?? null;
      let effectiveToolsEnabled: any = undefined;
      let effectiveKbConfig: any = undefined;

      if (chatProfileId) {
        const profile = await prisma.chatProfile.findFirst({
          where: { id: chatProfileId, orgId },
        });

        if (!profile) {
          return reply.code(404).send({ error: 'CHAT_PROFILE_NOT_FOUND' });
        }

        // Validate model against registry
        try {
          await resolveModelForOrg(orgId, profile.modelProvider, profile.modelName);
        } catch (err) {
          return reply
            .code(400)
            .send({ error: 'MODEL_NOT_ENABLED', message: (err as Error).message });
        }

        // Use profile's model config
        effectiveModel = `${profile.modelProvider}:${profile.modelName}`;
        effectiveTemperature = profile.temperature;
        effectiveTopP = profile.topP;
        _effectiveMaxTokens = profile.maxTokens;
        void _effectiveMaxTokens; // Suppress unused variable warning

        // Render system prompt from template if present
        if (profile.systemTemplateId && profile.systemTemplateVersion) {
          const rendered = await renderSystemPromptFromProfile(profile.id, {
            orgId,
            userId: payload.userId,
            conversationId: undefined,
          });
          if (rendered) {
            effectiveSystemPrompt = rendered;
          }
        }

        // Configure tools and RAG based on profile
        if (profile.enableTools) {
          effectiveToolsEnabled = { structuredTools: true };
        }
        if (profile.enableRag) {
          effectiveKbConfig = { rag: { enabled: true } };
        }
      }

      const conversation = await prisma.conversation.create({
        data: {
          orgId,
          userId: payload.userId,
          title: title && title.trim() ? title.trim() : 'New chat',
          model: effectiveModel,
          temperature: effectiveTemperature,
          topP: effectiveTopP,
          systemPrompt: effectiveSystemPrompt,
          chatProfileId: effectiveChatProfileId,
          toolsEnabled: effectiveToolsEnabled,
          kbConfig: effectiveKbConfig,
        },
        select: {
          id: true,
          title: true,
          model: true,
          pinned: true,
          archivedAt: true,
          lastActivityAt: true,
          createdAt: true,
          chatProfileId: true,
        },
      });

      // Emit event for conversation creation
      await emitEvent({
        type: 'conversation.created',
        context: {
          orgId,
          userId: payload.userId,
          conversationId: conversation.id,
        },
        metadata: {
          modelId: conversation.model,
          chatProfileId: conversation.chatProfileId,
        },
      }).catch((err) => {
        // Log but don't fail the request
        console.error('Failed to emit conversation.created event:', err);
      });

      return reply.code(201).send(conversation);
    },
  );

  // List conversations visible to the user (own + orgs)
  // Kullanıcının görebileceği konuşmaları listele (kendi + org'lar)
  app.get(
    '/conversations',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const parsedQuery = listPersonalQuerySchema.safeParse(request.query);
      const limit = parsedQuery.success ? parsedQuery.data.limit : 100;

      const orgIds = await getUserOrgIds(payload.userId);

      const orConditions: any[] = [{ userId: payload.userId }];
      if (orgIds.length > 0) {
        orConditions.push({ orgId: { in: orgIds } });
      }

      const conversations = await prisma.conversation.findMany({
        where: {
          OR: orConditions,
        },
        select: {
          id: true,
          title: true,
          lastActivityAt: true,
          createdAt: true,
          updatedAt: true,
          orgId: true,
          userId: true,
          model: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: limit,
      });

      return reply.send({
        conversations: conversations.map(
          (c: {
            id: string;
            title: string;
            lastActivityAt: Date;
            createdAt: Date;
            updatedAt: Date;
            orgId: string | null;
            userId: string | null;
            model: string;
          }) => ({
            id: c.id,
            title: c.title,
            model: c.model,
            createdAt: c.createdAt,
            updatedAt: c.updatedAt,
            orgId: c.orgId || undefined,
          }),
        ),
      });
    },
  );

  // Create a new conversation
  // Yeni bir konuşma oluştur
  app.post(
    '/conversations',
    {
      preHandler: [app.authenticate],
      config: {
        rateLimit: {
          max: 60,
          timeWindow: '1 minute',
        },
      },
    },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const parseResult = createConversationBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.code(400).send({
          error: request.i18n.t('errors.invalidMessageData'),
          details: parseResult.error.format(),
        });
      }

      const { title, systemPrompt, model, temperature, topP, chatProfileId } = parseResult.data;

      // If chatProfileId is provided, load profile and use its config (42.md)
      // chatProfileId sağlanmışsa, profili yükle ve yapılandırmasını kullan (42.md)
      let effectiveModel = model ?? undefined;
      let effectiveTemperature: number | undefined = temperature;
      let effectiveTopP: number | undefined = topP;
      let effectiveSystemPrompt: string | undefined = systemPrompt;
      const effectiveChatProfileId: string | null = chatProfileId ?? null;
      let effectiveToolsEnabled: any = undefined;
      let effectiveKbConfig: any = undefined;

      if (chatProfileId && payload.orgId) {
        const profile = await prisma.chatProfile.findFirst({
          where: { id: chatProfileId, orgId: payload.orgId },
        });

        if (profile) {
          // Validate model against registry
          try {
            await resolveModelForOrg(payload.orgId, profile.modelProvider, profile.modelName);
          } catch (err) {
            return reply
              .code(400)
              .send({ error: 'MODEL_NOT_ENABLED', message: (err as Error).message });
          }

          // Use profile's model config
          effectiveModel = `${profile.modelProvider}:${profile.modelName}`;
          effectiveTemperature = profile.temperature;
          effectiveTopP = profile.topP;

          // Render system prompt from template if present
          if (profile.systemTemplateId && profile.systemTemplateVersion) {
            const rendered = await renderSystemPromptFromProfile(profile.id, {
              orgId: payload.orgId!,
              userId: payload.userId,
              conversationId: undefined,
            });
            if (rendered) {
              effectiveSystemPrompt = rendered;
            }
          }

          // Configure tools and RAG based on profile
          if (profile.enableTools) {
            effectiveToolsEnabled = { structuredTools: true };
          }
          if (profile.enableRag) {
            effectiveKbConfig = { rag: { enabled: true } };
          }
        }
      }

      const conversation = await prisma.conversation.create({
        data: {
          title: title ?? undefined,
          systemPrompt: effectiveSystemPrompt,
          model: effectiveModel ?? undefined,
          temperature: effectiveTemperature,
          topP: effectiveTopP,
          userId: payload.userId,
          orgId: payload.orgId ?? null,
          chatProfileId: effectiveChatProfileId,
          toolsEnabled: effectiveToolsEnabled,
          kbConfig: effectiveKbConfig,
        },
      });

      return reply.code(201).send({
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        orgId: conversation.orgId,
        chatProfileId: conversation.chatProfileId,
      });
    },
  );

  // Get conversation details + recent messages
  // Konuşma detaylarını + son mesajları al
  app.get('/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);

    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }

    const conversationId = parseParams.data.id;

    // ⚡ Bolt: Removed unnecessary query for orgMemberships.
    // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
    // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
    // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load.
    // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 200,
        },
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    // Verify access rights
    if (conversation.orgId) {
      try {
        await assertOrgPermission(
          { id: payload.userId, isSuperadmin: payload.isSuperadmin },
          conversation.orgId,
          'conversation:read',
        );
      } catch (err: any) {
        if (err.statusCode === 403) {
          // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
          return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
        }
        throw err;
      }
    } else if (conversation.userId !== payload.userId) {
      // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    return reply.send({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        model: conversation.model,
        systemPrompt: conversation.systemPrompt,
        temperature: conversation.temperature,
        topP: conversation.topP,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        orgId: conversation.orgId,
        messages: conversation.messages.map(
          (m: { id: string; role: string; content: string; createdAt: Date; meta: unknown }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt,
            meta: m.meta,
          }),
        ),
      },
    });
  });

  // Patch conversation settings (title/model/systemPrompt/temperature/topP)
  // Konuşma ayarlarını güncelle (title/model/systemPrompt/temperature/topP)
  app.patch('/conversations/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }
    const conversationId = parseParams.data.id;

    const parseBody = updateConversationBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({
        error: request.i18n.t('errors.validationError'),
        details: parseBody.error.format(),
      });
    }

    // ⚡ Bolt: Removed unnecessary query for orgMemberships.
    // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
    // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
    // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load.
    // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
    const existingConversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        id: true,
        orgId: true,
        userId: true,
      },
    });

    if (!existingConversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    // Verify access: if org conversation, check org permission; if personal, allow owner
    if (existingConversation.orgId) {
      try {
        const userRole = await assertOrgPermission(
          { id: payload.userId, isSuperadmin: payload.isSuperadmin },
          existingConversation.orgId,
          'conversation:chat',
        );

        // IDOR Prevention: Only allow update if:
        // 1. User is Superadmin
        // 2. User is Org OWNER or ADMIN
        // 3. User is the creator of the conversation
        const isSuperadmin = payload.isSuperadmin;
        const isOrgAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
        const isConversationOwner = existingConversation.userId === payload.userId;

        if (!isSuperadmin && !isOrgAdmin && !isConversationOwner) {
          return reply.code(403).send({ error: request.i18n.t('errors.forbidden') });
        }
      } catch (err: any) {
        if (err.statusCode === 403) {
          // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
          return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
        }
        throw err;
      }
    } else if (existingConversation.userId !== payload.userId) {
      // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    const data: any = {};

    if ('title' in parseBody.data && parseBody.data.title !== undefined) {
      data.title = parseBody.data.title ? parseBody.data.title.trim() || 'Untitled chat' : null;
    }
    if ('systemPrompt' in parseBody.data) {
      data.systemPrompt = parseBody.data.systemPrompt ?? null;
    }
    if ('model' in parseBody.data) {
      data.model = parseBody.data.model ?? null;
    }
    if ('temperature' in parseBody.data) {
      data.temperature = parseBody.data.temperature ?? null;
    }
    if ('topP' in parseBody.data) {
      data.topP = parseBody.data.topP ?? null;
    }
    if (typeof parseBody.data.pinned === 'boolean') {
      data.pinned = parseBody.data.pinned;
    }
    if (typeof parseBody.data.archived === 'boolean') {
      data.archivedAt = parseBody.data.archived ? new Date() : null;
    }
    if ('kbConfig' in parseBody.data && parseBody.data.kbConfig !== undefined) {
      data.kbConfig = parseBody.data.kbConfig;
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        title: true,
        model: true,
        systemPrompt: true,
        temperature: true,
        topP: true,
        pinned: true,
        archivedAt: true,
        lastActivityAt: true,
        createdAt: true,
        updatedAt: true,
        orgId: true,
      },
    });

    return reply.send({
      conversation: {
        id: updated.id,
        title: updated.title,
        model: updated.model,
        systemPrompt: updated.systemPrompt,
        temperature: updated.temperature,
        topP: updated.topP,
        pinned: updated.pinned,
        archivedAt: updated.archivedAt,
        lastActivityAt: updated.lastActivityAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        orgId: updated.orgId,
      },
    });
  });

  // Delete a message
  // Bir mesajı sil
  app.delete(
    '/conversations/:id/messages/:messageId',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({
        id: z.string().min(1),
        messageId: z.string().min(1),
      });
      const parseParams = paramsSchema.safeParse(request.params);
      if (!parseParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidParams') });
      }
      const { id: conversationId, messageId } = parseParams.data;

      // ⚡ Bolt: Removed unnecessary query for orgMemberships.
      // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
      // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
      // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load.
      // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        select: {
          id: true,
          orgId: true,
          userId: true,
        },
      });

      if (!conversation) {
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      // Verify access
      let userRole: string | null = null;
      if (conversation.orgId) {
        try {
          userRole = await assertOrgPermission(
            { id: payload.userId, isSuperadmin: payload.isSuperadmin },
            conversation.orgId,
            'conversation:chat',
          );
        } catch (err: any) {
          if (err.statusCode === 403) {
            // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
            return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
          }
          throw err;
        }
      } else if (conversation.userId !== payload.userId) {
        // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId: conversation.id,
        },
      });

      if (!message) {
        return reply.code(404).send({ error: request.i18n.t('errors.messageNotFound') });
      }

      // Authorization: Only allow if:
      // 1. User is Superadmin
      // 2. User is Org Owner or Admin
      // 3. User is the creator of the conversation
      // 4. User is the author of the message
      const isSuperadmin = payload.isSuperadmin;
      const isOrgAdmin = userRole === 'OWNER' || userRole === 'ADMIN';
      const isConversationOwner = conversation.userId === payload.userId;
      const isMessageAuthor = message.authorId === payload.userId;

      if (!isSuperadmin && !isOrgAdmin && !isConversationOwner && !isMessageAuthor) {
        return reply.code(403).send({ error: request.i18n.t('errors.forbidden') });
      }

      await prisma.message.delete({
        where: { id: messageId },
      });

      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      });

      return reply.send({ success: true });
    },
  );

  // Usage summary for a conversation (aggregated from assistant messages)
  // Bir konuşma için kullanım özeti (asistan mesajlarından toplanır)
  app.get(
    '/conversations/:id/usage',
    { preHandler: [app.authenticate] },
    async (request, reply) => {
      const payload = request.user as JwtPayload;

      const paramsSchema = z.object({ id: z.string().min(1) });
      const parseParams = paramsSchema.safeParse(request.params);
      if (!parseParams.success) {
        return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
      }

      const conversationId = parseParams.data.id;

      // ⚡ Bolt: Removed unnecessary query for orgMemberships.
      // 💡 What: Replaced an N+1 style lookup (fetching all user memberships to construct an OR clause) with a direct O(1) indexed lookup by conversationId.
      // 🎯 Why: Fetching all memberships first was a redundant operation. By fetching the conversation directly by its primary key, we can then cleanly delegate permission checks to assertOrgPermission, which already efficiently handles org role verification.
      // 📊 Impact: Reduces database queries from 2 to 1 for this endpoint, improving response time and lowering database load.
      // 🔬 Measurement: Verify endpoint latency using a load testing tool or application performance monitoring (APM) system.
      const conversation = await prisma.conversation.findUnique({
        where: {
          id: conversationId,
        },
        select: {
          id: true,
          orgId: true,
          userId: true,
        },
      });

      if (!conversation) {
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      // Verify access rights
      if (conversation.orgId) {
        try {
          await assertOrgPermission(
            { id: payload.userId, isSuperadmin: payload.isSuperadmin },
            conversation.orgId,
            'conversation:read',
          );
        } catch (err: any) {
          if (err.statusCode === 403) {
            // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
            return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
          }
          throw err;
        }
      } else if (conversation.userId !== payload.userId) {
        // Return 404 instead of 403 to prevent IDOR / data exposure of existing conversation IDs
        return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
      }

      // Optimized aggregation using raw SQL to avoid fetching all message bodies
      // This is significantly faster for long conversations as it avoids transferring
      // large JSON payloads and processing them in the application layer.
      const result: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE(SUM(CASE WHEN meta->'usage'->>'promptTokens' ~ '^[0-9]+$' THEN CAST(meta->'usage'->>'promptTokens' AS INTEGER) ELSE 0 END), 0) as "promptTokens",
        COALESCE(SUM(CASE WHEN meta->'usage'->>'completionTokens' ~ '^[0-9]+$' THEN CAST(meta->'usage'->>'completionTokens' AS INTEGER) ELSE 0 END), 0) as "completionTokens",
        COUNT(CASE WHEN meta->'usage' IS NOT NULL THEN 1 END) as "completions",
        MAX("createdAt") as "lastMessageAt"
      FROM "Message"
      WHERE "conversationId" = ${conversationId}
        AND "role" = 'ASSISTANT'
    `;

      const row = result[0] || {};
      // Prisma/Postgres returns BigInt for aggregations, so we must convert to Number
      const totalPromptTokens = Number(row.promptTokens || 0);
      const totalCompletionTokens = Number(row.completionTokens || 0);
      const completions = Number(row.completions || 0);
      const lastMessageAt = row.lastMessageAt ? new Date(row.lastMessageAt) : null;

      const totalTokens = totalPromptTokens + totalCompletionTokens;

      return reply.send({
        conversationId,
        totals: {
          promptTokens: totalPromptTokens,
          completionTokens: totalCompletionTokens,
          totalTokens,
        },
        completions,
        lastMessageAt: lastMessageAt ? lastMessageAt.toISOString() : null,
      });
    },
  );
}
