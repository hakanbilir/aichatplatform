// apps/api-gateway/src/routes/conversationPresets.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import {
  createConversationPreset,
  deleteConversationPreset,
  listConversationPresets,
  updateConversationPreset
} from '../services/conversationPresets';
import { emitEvent } from '../events/emitter';

const presetBodySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  uiConfig: z.record(z.any()).optional(),
  systemPrompt: z.string().min(1),
  config: z.record(z.any())
});

const updateBodySchema = presetBodySchema.partial();

export default async function conversationPresetsRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/presets', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:read'
    );

    const presets = await listConversationPresets(orgId);
    return reply.send({ presets });
  });

  app.post('/orgs/:orgId/presets', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    const parsed = presetBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

          const preset = await createConversationPreset({
            orgId,
            createdById: payload.userId,
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            uiConfig: parsed.data.uiConfig ?? {},
            systemPrompt: parsed.data.systemPrompt,
            config: parsed.data.config
          });

          // Emit event
          await emitEvent({
            type: 'org.preset_created',
            context: {
              orgId,
              userId: payload.userId
            },
            metadata: {
              presetId: preset.id,
              name: preset.name,
              modelId: (preset.config as any)?.modelId
            }
          }).catch((err) => {
            console.error('Failed to emit org.preset_created event:', err);
          });

          return reply.code(201).send({ preset });
  });

  app.patch('/orgs/:orgId/presets/:presetId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;
    const presetId = (request.params as any).presetId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    const parsed = updateBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    await updateConversationPreset(orgId, presetId, parsed.data);

    // Emit event (fetch preset for metadata)
    const preset = await prisma.conversationPreset.findFirst({
      where: { id: presetId, orgId }
    });

    if (preset) {
      await emitEvent({
        type: 'org.preset_updated',
        context: {
          orgId,
          userId: payload.userId
        },
        metadata: {
          presetId: preset.id,
          name: preset.name
        }
      }).catch((err) => {
        console.error('Failed to emit org.preset_updated event:', err);
      });
    }

    return reply.send({ ok: true });
  });

  app.delete('/orgs/:orgId/presets/:presetId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;
    const presetId = (request.params as any).presetId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    await deleteConversationPreset(orgId, presetId);
    return reply.send({ ok: true });
  });
}

