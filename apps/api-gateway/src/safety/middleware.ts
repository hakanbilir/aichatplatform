// apps/api-gateway/src/safety/middleware.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import { getModerationProvider } from './provider';
import { decideSafetyAction } from './policy';
import { prisma } from '@ai-chat/db';
import { ModerationSource } from './types';

interface SafetyContext {
  orgId: string;
  conversationId?: string;
  userId?: string;
  source: ModerationSource;
  content: string;
}

export async function runModeration(ctx: SafetyContext) {
  const provider = getModerationProvider();
  const result = await provider.moderate(ctx.content, {
    orgId: ctx.orgId,
    userId: ctx.userId
  });

  if (!result.flagged || result.categories.length === 0) {
    return {
      action: 'allow' as const,
      categories: [],
      reason: undefined
    };
  }

  const decision = await decideSafetyAction(ctx.orgId, result);

  const isSevere = decision.action === 'block';

  await prisma.moderationIncident.create({
    data: {
      orgId: ctx.orgId,
      conversationId: ctx.conversationId ?? null,
      userId: ctx.userId ?? null,
      source: ctx.source,
      categories: decision.categories as any, // Prisma Json type
      action: decision.action,
      reason: decision.reason,
      contentSnippet: ctx.content.slice(0, 512),
      isSevere
    }
  });

  // Optional: emitEvent('safety.moderation_incident', ...)

  return decision;
}

// Example Fastify preHandler for user message creation
export async function userMessageSafetyGuard(request: FastifyRequest, reply: FastifyReply) {
  const { orgId, conversationId } = request.params as any;
  const body: any = request.body;
  const content: string = body?.content ?? '';

  const user = request.user as any; // JwtPayload

  const cfg = await prisma.orgSafetyConfig.findUnique({ where: { orgId } });
  if (cfg && !cfg.moderateUserMessages) {
    return; // skip
  }

  const decision = await runModeration({
    orgId,
    conversationId,
    userId: user?.userId,
    source: 'user',
    content
  });

  if (decision.action === 'block') {
    return reply.code(403).send({
      error: 'MESSAGE_BLOCKED_BY_SAFETY',
      reason: decision.reason,
      categories: decision.categories
    });
  }

  if (decision.action === 'warn') {
    // We still allow the message but include warning in response metadata.
    // The calling handler may decide to surface this in the UI.
    (request as any).safetyWarning = {
      reason: decision.reason,
      categories: decision.categories
    };
  }
}
