// apps/api-gateway/src/routes/base-models.ts
// Base model management routes

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission } from '../rbac/guards';

const createBaseModelBodySchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  modelId: z.string().min(1),
  family: z.string().optional(),
  contextWindow: z.number().int().positive().optional(),
  languages: z.array(z.string()).optional(),
  capabilities: z.array(z.string()).optional(),
  isTrainingAllowed: z.boolean().optional(),
  orgId: z.string().optional(), // Optional: null means system-wide
});

// Helper to get orgId from request
async function getOrgId(request: any): Promise<string | null> {
  const payload = request.user as JwtPayload;
  const orgId = (request.headers['x-org-id'] as string) || (request.tenant?.orgId as string);

  if (!orgId) {
    const membership = await prisma.orgMember.findFirst({
      where: { userId: payload.userId },
      include: { org: true },
    });

    return membership?.orgId || null;
  }

  return orgId;
}

export default async function baseModelsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List base models (system-wide and org-specific)
  app.get('/api/v1/base-models', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = await getOrgId(request);

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId || '',
      'org:read',
    );

    // Get both system-wide (orgId = null) and org-specific models
    const baseModels = await prisma.baseModel.findMany({
      where: {
        OR: [
          { orgId: null }, // System-wide models
          ...(orgId ? [{ orgId }] : []), // Org-specific models
        ],
        isTrainingAllowed: true,
      },
      orderBy: [
        { orgId: 'asc' }, // System-wide first
        { name: 'asc' },
      ],
    });

    return reply.send(baseModels);
  });

  // Get base model by ID
  app.get('/api/v1/base-models/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = await getOrgId(request);

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parsedParams = paramsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      return reply.code(400).send({ error: 'Invalid base model ID' });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId || '',
      'org:read',
    );

    const baseModel = await prisma.baseModel.findUnique({
      where: { id: parsedParams.data.id },
    });

    if (!baseModel) {
      return reply.code(404).send({ error: 'Base model not found' });
    }

    // Check access: system-wide or org-specific
    if (baseModel.orgId && baseModel.orgId !== orgId && !payload.isSuperadmin) {
      return reply.code(403).send({ error: 'Access denied' });
    }

    return reply.send(baseModel);
  });

  // Create base model (admin only for system-wide, org members for org-specific)
  app.post('/api/v1/base-models', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = await getOrgId(request);

    const parseBody = createBaseModelBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: 'Invalid base model data', details: parseBody.error.format() });
    }

    const modelOrgId = parseBody.data.orgId || orgId;

    // System-wide models require superadmin
    if (!modelOrgId && !payload.isSuperadmin) {
      return reply.code(403).send({ error: 'Only superadmins can create system-wide base models' });
    }

    // Org-specific models require org write permission
    if (modelOrgId) {
      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        modelOrgId,
        'org:settings:write',
      );
    }

    // Check for existing model with same provider/modelId in org
    // Note: Prisma unique constraint handles this, but we check first for better error message
    const existing = await prisma.baseModel.findFirst({
      where: {
        orgId: modelOrgId,
        provider: parseBody.data.provider,
        modelId: parseBody.data.modelId,
      },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Base model with this provider and modelId already exists' });
    }

    const baseModel = await prisma.baseModel.create({
      data: {
        orgId: modelOrgId,
        provider: parseBody.data.provider,
        name: parseBody.data.name,
        modelId: parseBody.data.modelId,
        family: parseBody.data.family,
        contextWindow: parseBody.data.contextWindow,
        languages: parseBody.data.languages || [],
        capabilities: parseBody.data.capabilities || [],
        isTrainingAllowed: parseBody.data.isTrainingAllowed ?? true,
      },
    });

    return reply.code(201).send(baseModel);
  });

  // Seed default base models (system-wide, superadmin only)
  app.post('/api/v1/base-models/seed', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    if (!payload.isSuperadmin) {
      return reply.code(403).send({ error: 'Only superadmins can seed base models' });
    }

    const defaultModels = [
      {
        orgId: null,
        provider: 'ollama',
        name: 'Llama 3 8B',
        modelId: 'llama3:8b',
        family: 'llama',
        contextWindow: 8192,
        languages: ['en', 'tr'],
        capabilities: ['chat', 'completion'],
        isTrainingAllowed: true,
      },
      {
        orgId: null,
        provider: 'ollama',
        name: 'Mistral 7B',
        modelId: 'mistral:7b',
        family: 'mistral',
        contextWindow: 8192,
        languages: ['en', 'tr'],
        capabilities: ['chat', 'completion'],
        isTrainingAllowed: true,
      },
      {
        orgId: null,
        provider: 'ollama',
        name: 'Llama 3.1 8B',
        modelId: 'llama3.1:8b',
        family: 'llama',
        contextWindow: 8192,
        languages: ['en', 'tr'],
        capabilities: ['chat', 'completion'],
        isTrainingAllowed: true,
      },
    ];

    const created = [];
    for (const model of defaultModels) {
      try {
        const existing = await prisma.baseModel.findFirst({
          where: {
            orgId: model.orgId,
            provider: model.provider,
            modelId: model.modelId,
          },
        });

        if (!existing) {
          const baseModel = await prisma.baseModel.create({ data: model });
          created.push(baseModel);
        }
      } catch (error) {
        // Skip if already exists
      }
    }

    return reply.send({ created: created.length, models: created });
  });
}
