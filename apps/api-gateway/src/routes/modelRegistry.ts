// apps/api-gateway/src/routes/modelRegistry.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';

const upsertModelSchema = z.object({
  provider: z.string().min(1),
  modelName: z.string().min(1),
  displayName: z.string().min(1),
  description: z.string().optional(),
  isEnabled: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  capabilities: z.array(z.string()).optional(),
  contextWindow: z.number().int().min(1).optional(),
  maxOutputTokens: z.number().int().min(1).optional(),
  inputPriceMicros: z.number().int().min(0).optional(),
  outputPriceMicros: z.number().int().min(0).optional(),
  metadata: z.record(z.any()).optional()
});

export default async function modelRegistryRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // List models for org (merged global + org, computed enabled flag)
  app.get('/orgs/:orgId/models', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:models:read'
    );

    const [globalEntries, orgEntries] = await Promise.all([
      prisma.modelRegistryEntry.findMany({ where: { orgId: null } }),
      prisma.modelRegistryEntry.findMany({ where: { orgId } })
    ]);

    const merged = new Map<string, any>();

    for (const e of globalEntries) {
      const key = `${e.provider}:${e.modelName}`;
      merged.set(key, { scope: 'global', ...e });
    }

    for (const e of orgEntries) {
      const key = `${e.provider}:${e.modelName}`;
      merged.set(key, { scope: 'org', ...e });
    }

    const models = Array.from(merged.values()).map((e) => ({
      id: e.id,
      orgId: e.orgId,
      provider: e.provider,
      modelName: e.modelName,
      displayName: e.displayName,
      description: e.description,
      isEnabled: e.isEnabled,
      isDefault: e.isDefault,
      capabilities: e.capabilities,
      contextWindow: e.contextWindow,
      maxOutputTokens: e.maxOutputTokens,
      inputPriceMicros: e.inputPriceMicros,
      outputPriceMicros: e.outputPriceMicros,
      metadata: e.metadata,
      scope: e.scope
    }));

    return reply.send({ models });
  });

  // Upsert org-scoped model entry
  app.put('/orgs/:orgId/models', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:models:write'
    );

    const parsed = upsertModelSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const d = parsed.data;

    if (d.isDefault) {
      await prisma.modelRegistryEntry.updateMany({
        where: { orgId, provider: d.provider },
        data: { isDefault: false }
      });
    }

    const entry = await prisma.modelRegistryEntry.upsert({
      where: {
        org_provider_model_unique: {
          orgId,
          provider: d.provider,
          modelName: d.modelName
        }
      },
      update: {
        displayName: d.displayName,
        description: d.description ?? null,
        isEnabled: typeof d.isEnabled === 'boolean' ? d.isEnabled : undefined,
        isDefault: typeof d.isDefault === 'boolean' ? d.isDefault : undefined,
        capabilities: d.capabilities ?? undefined,
        contextWindow: d.contextWindow ?? undefined,
        maxOutputTokens: d.maxOutputTokens ?? undefined,
        inputPriceMicros: d.inputPriceMicros ?? undefined,
        outputPriceMicros: d.outputPriceMicros ?? undefined,
        metadata: d.metadata ?? undefined
      },
      create: {
        orgId,
        provider: d.provider,
        modelName: d.modelName,
        displayName: d.displayName,
        description: d.description ?? null,
        isEnabled: d.isEnabled ?? true,
        isDefault: d.isDefault ?? false,
        capabilities: d.capabilities ?? [],
        contextWindow: d.contextWindow,
        maxOutputTokens: d.maxOutputTokens,
        inputPriceMicros: d.inputPriceMicros,
        outputPriceMicros: d.outputPriceMicros,
        metadata: d.metadata ?? {}
      }
    });

    // Optional: emitEvent('model_registry.upserted', ...)

    return reply.send({ model: entry });
  });
}
