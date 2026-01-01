import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';
import { emitEvent } from '../events/emitter';
import { renderSystemPromptFromProfile } from '../promptStudio/render';
import { resolveModelForOrg } from '../llm/modelRegistryService';

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

export default async function conversationsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List conversations for an org (non-archived by default)
  app.get('/orgs/:orgId/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }
    const orgId = parsedParams.data.orgId;

    const parsedQuery = listQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidQuery'), details: parsedQuery.error.format() });
    }

    const { search, limit, cursor } = parsedQuery.data;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'conversation:chat'
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
  });

  // Create a new conversation in an org
  app.post('/orgs/:orgId/conversations', {
    preHandler: [app.authenticate],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }
    const orgId = parsedParams.data.orgId;

    const parsedBody = createOrgConversationBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.validationError'), details: parsedBody.error.format() });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'conversation:chat'
    );

    const { title, model, chatProfileId } = parsedBody.data;

    // If chatProfileId is provided, load profile and use its config (42.md)
    // chatProfileId sağlanmışsa, profili yükle ve yapılandırmasını kullan (42.md)
    let effectiveModel = model && model.trim() ? model.trim() : 'llama3.1';
    let effectiveTemperature: number | undefined = undefined;
    let effectiveTopP: number | undefined = undefined;
    // effectiveMaxTokens is not currently used but kept for future use
    // @ts-ignore - intentionally unused, reserved for future use
    let _effectiveMaxTokens: number | null | undefined = undefined;
    void _effectiveMaxTokens; // Suppress unused variable warning
    let effectiveSystemPrompt: string | null | undefined = undefined;
    let effectiveChatProfileId: string | null = chatProfileId ?? null;
    let effectiveToolsEnabled: any = undefined;
    let effectiveKbConfig: any = undefined;

    if (chatProfileId) {
      const profile = await prisma.chatProfile.findFirst({
        where: { id: chatProfileId, orgId }
      });

      if (!profile) {
        return reply.code(404).send({ error: 'CHAT_PROFILE_NOT_FOUND' });
      }

      // Validate model against registry
      try {
        await resolveModelForOrg(orgId, profile.modelProvider, profile.modelName);
      } catch (err) {
        return reply.code(400).send({ error: 'MODEL_NOT_ENABLED', message: (err as Error).message });
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
          conversationId: undefined
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
        conversationId: conversation.id
      },
      metadata: {
        modelId: conversation.model,
        chatProfileId: conversation.chatProfileId
      }
    }).catch((err) => {
      // Log but don't fail the request
      console.error('Failed to emit conversation.created event:', err);
    });

    return reply.code(201).send(conversation);
  });

  // List conversations visible to the user (own + orgs)
  // Kullanıcının görebileceği konuşmaları listele (kendi + org'lar)
  app.get('/conversations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

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
      take: 100,
    });

    return reply.send({
      conversations: conversations.map((c: { id: string; title: string; lastActivityAt: Date; createdAt: Date; updatedAt: Date; orgId: string | null; userId: string | null; model: string }) => ({
        id: c.id,
        title: c.title,
        model: c.model,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        orgId: c.orgId || undefined,
      })),
    });
  });

  // Create a new conversation
  // Yeni bir konuşma oluştur
  app.post('/conversations', {
    preHandler: [app.authenticate],
    config: {
      rateLimit: {
        max: 60,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parseResult = createConversationBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidMessageData'), details: parseResult.error.format() });
    }

    const { title, systemPrompt, model, temperature, topP, chatProfileId } = parseResult.data;

    // If chatProfileId is provided, load profile and use its config (42.md)
    // chatProfileId sağlanmışsa, profili yükle ve yapılandırmasını kullan (42.md)
    let effectiveModel = model ?? undefined;
    let effectiveTemperature: number | undefined = temperature;
    let effectiveTopP: number | undefined = topP;
    let effectiveSystemPrompt: string | undefined = systemPrompt;
    let effectiveChatProfileId: string | null = chatProfileId ?? null;
    let effectiveToolsEnabled: any = undefined;
    let effectiveKbConfig: any = undefined;

    if (chatProfileId && payload.orgId) {
      const profile = await prisma.chatProfile.findFirst({
        where: { id: chatProfileId, orgId: payload.orgId }
      });

      if (profile) {
        // Validate model against registry
        try {
          await resolveModelForOrg(payload.orgId, profile.modelProvider, profile.modelName);
        } catch (err) {
          return reply.code(400).send({ error: 'MODEL_NOT_ENABLED', message: (err as Error).message });
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
            conversationId: undefined
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
  });

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

    const orgIds = await getUserOrgIds(payload.userId);

    const orConditions: any[] = [{ userId: payload.userId }];
    if (orgIds.length > 0) {
      orConditions.push({ orgId: { in: orgIds } });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: orConditions,
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
        messages: conversation.messages.map((m: { id: string; role: string; content: string; createdAt: Date; meta: unknown }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
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
      return reply.code(400).send({ error: request.i18n.t('errors.validationError'), details: parseBody.error.format() });
    }

    const orgIds = await getUserOrgIds(payload.userId);
    const orConditions: any[] = [{ userId: payload.userId }];
    if (orgIds.length > 0) {
      orConditions.push({ orgId: { in: orgIds } });
    }

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: orConditions,
      },
      select: {
        id: true,
        orgId: true,
      },
    });

    if (!existingConversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    // Verify access: if org conversation, check org permission; if personal, allow owner
    if (existingConversation.orgId) {
      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        existingConversation.orgId,
        'conversation:chat'
      );
    } else {
      // Personal conversation - verify ownership
      // Reuse orgIds from above (line 339)
      const accessOrConditions: any[] = [{ userId: payload.userId }];
      if (orgIds.length > 0) {
        accessOrConditions.push({ orgId: { in: orgIds } });
      }
      const accessCheck = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: accessOrConditions,
        },
      });
      if (!accessCheck) {
        return reply.code(403).send({ error: request.i18n.t('errors.forbidden') });
      }
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

  // Usage summary for a conversation (aggregated from assistant messages)
  // Bir konuşma için kullanım özeti (asistan mesajlarından toplanır)
  app.get('/conversations/:id/usage', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }

    const conversationId = parseParams.data.id;

    const orgIds = await getUserOrgIds(payload.userId);
    const orConditions: any[] = [{ userId: payload.userId }];
    if (orgIds.length > 0) {
      orConditions.push({ orgId: { in: orgIds } });
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: orConditions,
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        role: 'ASSISTANT',
      },
      select: {
        meta: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let completions = 0;
    let lastMessageAt: Date | null = null;

    for (const m of messages) {
      const meta: any = m.meta ?? {};
      const usage = meta?.usage;

      if (usage && typeof usage === 'object') {
        const promptTokens = typeof usage.promptTokens === 'number' ? usage.promptTokens : 0;
        const completionTokens = typeof usage.completionTokens === 'number' ? usage.completionTokens : 0;

        totalPromptTokens += promptTokens;
        totalCompletionTokens += completionTokens;
        completions += 1;

        if (!lastMessageAt || m.createdAt > lastMessageAt) {
          lastMessageAt = m.createdAt;
        }
      }
    }

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
  });
}

