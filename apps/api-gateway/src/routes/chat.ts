import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import {
  ConversationContext,
  OrchestratorOptions,
  createUserMessage,
  runChatCompletion,
  streamChatCompletionOrchestrated,
} from '@ai-chat/chat-orchestrator';
import { ChatMessage, ChatRole, ChatStreamEvent } from '@ai-chat/core-types';
import { z } from 'zod';
import { chatCompletionDurationSeconds, chatCompletionTokensTotal } from '../metrics';
import { recordUsage } from '../usage/usageTracker';
// import { getOrgQuotaWindowUsage } from '../services/orgQuotaGuard'; // Unused for now

const sendMessageBodySchema = z.object({
  content: z.string().min(1).max(32000), // 32KB max per message
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
});

function mapDbRoleToChatRole(dbRole: string): ChatRole {
  switch (dbRole) {
    case 'SYSTEM':
      return 'system';
    case 'ASSISTANT':
      return 'assistant';
    case 'TOOL':
      return 'tool';
    case 'USER':
    default:
      return 'user';
  }
}

function buildConversationContext(conversation: any): ConversationContext {
  const history: ChatMessage[] = conversation.messages.map((m: any) => ({
    id: m.id,
    role: mapDbRoleToChatRole(m.role),
    content: m.content,
    createdAt: m.createdAt.toISOString(),
  }));

  const ctx: ConversationContext = {
    id: conversation.id,
    title: conversation.title ?? undefined,
    systemPrompt: conversation.systemPrompt ?? undefined,
    customInstructions: undefined, // can be filled from user profile later
    // Kullanıcı profilinden daha sonra doldurulabilir
    history,
  };

  return ctx;
}

export default async function chatRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  const orchestratorOptions: OrchestratorOptions = {
    maxContextTokens: 4000,
  };

  // Non-streaming message send
  // Streaming olmayan mesaj gönderme
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

    // Load conversation + messages, ensuring access rights
    // Konuşma + mesajları yükle, erişim haklarını sağlayarak
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

    // Persist user message immediately
    // Kullanıcı mesajını hemen kalıcı hale getir
    const userMessageRecord = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content,
        meta: {},
      },
    });

    // Add new message to in-memory history for this run
    // Bu çalıştırma için yeni mesajı bellek içi geçmişe ekle
    const conversationWithNewMessage = {
      ...conversation,
      messages: [...conversation.messages, userMessageRecord],
    };

    const context = buildConversationContext(conversationWithNewMessage);
    const userMessage = createUserMessage(content);

    const chosenModel = model ?? conversation.model ?? 'llama3.1';

    const endTimer = chatCompletionDurationSeconds.startTimer({
      model: chosenModel,
      streaming: 'false',
    });

    const response = await runChatCompletion(
      context,
      userMessage,
      orchestratorOptions,
      {
        model: chosenModel,
        temperature: temperature ?? conversation.temperature ?? 0.7,
        topP: topP ?? conversation.topP ?? 1,
        maxTokens,
      },
    );

    endTimer();

    if (response.usage) {
      const { promptTokens, completionTokens } = response.usage;
      if (typeof promptTokens === 'number') {
        chatCompletionTokensTotal.inc({ model: chosenModel, type: 'prompt' }, promptTokens);
      }
      if (typeof completionTokens === 'number') {
        chatCompletionTokensTotal.inc({ model: chosenModel, type: 'completion' }, completionTokens);
      }

      // Record usage for analytics (45.md)
      // Analitik için kullanımı kaydet (45.md)
      if (conversation.orgId) {
        const modelParts = chosenModel.split(':');
        const provider = modelParts[0] || 'ollama';
        const modelName = modelParts.slice(1).join(':') || chosenModel;

        await recordUsage({
          orgId: conversation.orgId,
          userId: payload.userId,
          provider,
          modelName,
          feature: 'chat',
          inputTokens: typeof promptTokens === 'number' ? promptTokens : 0,
          outputTokens: typeof completionTokens === 'number' ? completionTokens : 0
        }).catch((err) => {
          console.error('Failed to record usage:', err);
        });
      }
    }

    // Persist assistant message
    // Asistan mesajını kalıcı hale getir
    const assistantMessageRecord = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: response.message.content,
        meta: {
          usage: (response.usage ?? null) as unknown as Prisma.InputJsonValue,
          providerMeta: (response.providerMeta ?? null) as unknown as Prisma.InputJsonValue,
        },
      },
    });

    // Update conversation's updatedAt implicitly (via Prisma) or explicitly with a touch
    // Konuşmanın updatedAt'ini dolaylı olarak (Prisma aracılığıyla) veya açıkça bir dokunuşla güncelle
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    return reply.send({
      conversationId: conversation.id,
      userMessage: {
        id: userMessageRecord.id,
        role: userMessageRecord.role,
        content: userMessageRecord.content,
        createdAt: userMessageRecord.createdAt,
      },
      assistantMessage: {
        id: assistantMessageRecord.id,
        role: assistantMessageRecord.role,
        content: assistantMessageRecord.content,
        createdAt: assistantMessageRecord.createdAt,
      },
      usage: response.usage,
    });
  });

  // Streaming message send via SSE
  // SSE aracılığıyla streaming mesaj gönderme
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

    // Load conversation + messages, ensuring access rights
    // Konuşma + mesajları yükle, erişim haklarını sağlayarak
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

    // Persist user message immediately
    // Kullanıcı mesajını hemen kalıcı hale getir
    const userMessageRecord = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content,
        meta: {},
      },
    });

    const conversationWithNewMessage = {
      ...conversation,
      messages: [...conversation.messages, userMessageRecord],
    };

    const context = buildConversationContext(conversationWithNewMessage);
    const userMessage = createUserMessage(content);

    const chosenModel = model ?? conversation.model ?? 'llama3.1';

    const endTimer = chatCompletionDurationSeconds.startTimer({
      model: chosenModel,
      streaming: 'true',
    });

    // Set up SSE headers
    // SSE başlıklarını ayarla
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

    let finalAssistantContent = '';
    let finalUsage: any = null;

    try {
      for await (const event of streamChatCompletionOrchestrated(
        context,
        userMessage,
        orchestratorOptions,
        {
          model: chosenModel,
          temperature: temperature ?? conversation.temperature ?? 0.7,
          topP: topP ?? conversation.topP ?? 1,
          maxTokens,
          signal: abortController.signal,
        },
      )) {
        const outgoing: any = { type: event.type };

        if (event.type === 'token' && event.token) {
          outgoing.token = event.token;
          finalAssistantContent += event.token;
        }

        if (event.type === 'end') {
          if (event.finalMessage) {
            finalAssistantContent = event.finalMessage.content;
          }
          outgoing.message = {
            role: 'assistant',
            content: finalAssistantContent,
          };
          if (event.usage) {
            outgoing.usage = event.usage;
            finalUsage = event.usage;
          }
        }

        if (event.type === 'error' && event.error) {
          outgoing.error = event.error;
        }

        sendEvent(outgoing as ChatStreamEvent);
      }

      endTimer();

      if (finalUsage) {
        const { promptTokens, completionTokens } = finalUsage;
        if (typeof promptTokens === 'number') {
          chatCompletionTokensTotal.inc({ model: chosenModel, type: 'prompt' }, promptTokens);
        }
        if (typeof completionTokens === 'number') {
          chatCompletionTokensTotal.inc({ model: chosenModel, type: 'completion' }, completionTokens);
        }

        // Record usage for analytics (45.md)
        // Analitik için kullanımı kaydet (45.md)
        if (conversation.orgId) {
          const modelParts = chosenModel.split(':');
          const provider = modelParts[0] || 'ollama';
          const modelName = modelParts.slice(1).join(':') || chosenModel;

          await recordUsage({
            orgId: conversation.orgId,
            userId: payload.userId,
            provider,
            modelName,
            feature: 'chat',
            inputTokens: typeof promptTokens === 'number' ? promptTokens : 0,
            outputTokens: typeof completionTokens === 'number' ? completionTokens : 0
          }).catch((err) => {
            console.error('Failed to record usage:', err);
          });
        }
      }

      // Persist assistant message if we have any content
      // Herhangi bir içerik varsa asistan mesajını kalıcı hale getir
      if (finalAssistantContent.length > 0) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: finalAssistantContent,
            meta: {
              usage: finalUsage,
              providerMeta: null,
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            updatedAt: new Date(),
            lastActivityAt: new Date(),
          },
        });
      }

      reply.raw.end();
    } catch (err) {
      endTimer();

      // In case of an unexpected error, send an error event if possible
      // Beklenmeyen bir hata durumunda, mümkünse bir hata event'i gönder
      try {
        sendEvent({ type: 'error', error: (err as Error).message });
        reply.raw.end();
      } catch {
        // Ignore if connection already closed
        // Bağlantı zaten kapatıldıysa yoksay
      }
    }
  });
}

