// apps/api-gateway/src/routes/conversationSettings.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';

const paramsSchema = z.object({ id: z.string().min(1) });

const patchBodySchema = z.object({
  model: z.string().min(1).max(200).optional(),
  temperature: z.number().min(0).max(2).optional(),
  systemPrompt: z.string().max(20000).nullable().optional(),
  toolsEnabled: z
    .object({
      codeExecution: z.boolean().optional(),
      webSearch: z.boolean().optional(),
      structuredTools: z.boolean().optional(),
    })
    .partial()
    .optional(),
  kbConfig: z.any().optional(), // JSON field for knowledge base config (RAG settings)
});

export default async function conversationSettingsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions,
) {
  // Get settings for a conversation
  app.get('/conversations/:id/settings', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }

    const conversationId = parsedParams.data.id;

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        orgId: true,
        model: true,
        temperature: true,
        systemPrompt: true,
        toolsEnabled: true,
        kbConfig: true,
      },
    });

    if (!convo) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    if (convo.orgId) {
      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        convo.orgId,
        'conversation:chat',
      );
    } else {
      // Personal conversation - verify ownership
      const memberships = await prisma.orgMember.findMany({
        where: { userId: payload.userId },
        select: { orgId: true },
      });
      const orgIds = memberships.map((m: { orgId: string }) => m.orgId);
      const orConditions: any[] = [{ userId: payload.userId }];
      if (orgIds.length > 0) {
        orConditions.push({ orgId: { in: orgIds } });
      }
      const accessCheck = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: orConditions,
        },
      });
      if (!accessCheck) {
        return reply.code(403).send({ error: request.i18n.t('errors.forbidden') });
      }
    }

    return reply.send({
      id: convo.id,
      model: convo.model,
      temperature: convo.temperature ?? 0.7,
      systemPrompt: convo.systemPrompt ?? null,
      toolsEnabled: (convo.toolsEnabled as any) ?? {},
      kbConfig: (convo.kbConfig as any) ?? null,
    });
  });

  // Update settings for a conversation
  app.patch('/conversations/:id/settings', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidConversationId') });
    }

    const conversationId = parsedParams.data.id;

    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        orgId: true,
        toolsEnabled: true,
      },
    });

    if (!convo) {
      return reply.code(404).send({ error: request.i18n.t('errors.conversationNotFound') });
    }

    if (convo.orgId) {
      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        convo.orgId,
        'conversation:chat',
      );
    } else {
      // Personal conversation - verify ownership
      const memberships = await prisma.orgMember.findMany({
        where: { userId: payload.userId },
        select: { orgId: true },
      });
      const orgIds = memberships.map((m: { orgId: string }) => m.orgId);
      const orConditions: any[] = [{ userId: payload.userId }];
      if (orgIds.length > 0) {
        orConditions.push({ orgId: { in: orgIds } });
      }
      const accessCheck = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: orConditions,
        },
      });
      if (!accessCheck) {
        return reply.code(403).send({ error: request.i18n.t('errors.forbidden') });
      }
    }

    const parsedBody = patchBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsedBody.error.format() });
    }

    const { model, temperature, systemPrompt, toolsEnabled, kbConfig } = parsedBody.data;

    const data: any = {};

    if (typeof model === 'string') {
      data.model = model.trim();
    }

    if (typeof temperature === 'number') {
      data.temperature = temperature;
    }

    if (systemPrompt !== undefined) {
      data.systemPrompt = systemPrompt && systemPrompt.trim() ? systemPrompt : null;
    }

    if (toolsEnabled) {
      const existing = (convo.toolsEnabled as any) || {};
      data.toolsEnabled = {
        ...existing,
        ...toolsEnabled,
      };
    }

    if (kbConfig !== undefined) {
      data.kbConfig = kbConfig;
    }

    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data,
      select: {
        id: true,
        model: true,
        temperature: true,
        systemPrompt: true,
        toolsEnabled: true,
        kbConfig: true,
      },
    });

    return reply.send({
      id: updated.id,
      model: updated.model,
      temperature: updated.temperature ?? 0.7,
      systemPrompt: updated.systemPrompt ?? null,
      toolsEnabled: (updated.toolsEnabled as any) ?? {},
      kbConfig: (updated.kbConfig as any) ?? null,
    });
  });
}

