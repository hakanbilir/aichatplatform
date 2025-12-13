// apps/api-gateway/src/routes/chatProfiles.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import slugify from 'slugify';

const createProfileSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  isShared: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  modelProvider: z.string().min(1),
  modelName: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(32768).nullable().optional(),
  systemTemplateId: z.string().nullable().optional(),
  systemTemplateVersion: z.number().int().nullable().optional(),
  enableTools: z.boolean().optional(),
  enableRag: z.boolean().optional(),
  safetyLevel: z.string().optional(),
  providerConfig: z.record(z.any()).optional()
});

const updateProfileSchema = createProfileSchema.partial();

export default async function chatProfilesRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // List profiles for org (optionally only shared)
  app.get('/orgs/:orgId/chat-profiles', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat-profiles:read'
    );

    const onlyShared = (req.query as any).onlyShared === 'true';

    const profiles = await prisma.chatProfile.findMany({
      where: { orgId, ...(onlyShared ? { isShared: true } : {}) },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      profiles: profiles.map((p) => ({
        id: p.id,
        orgId: p.orgId,
        name: p.name,
        slug: p.slug,
        description: p.description,
        isShared: p.isShared,
        isDefault: p.isDefault,
        modelProvider: p.modelProvider,
        modelName: p.modelName,
        temperature: p.temperature,
        topP: p.topP,
        maxTokens: p.maxTokens,
        systemTemplateId: p.systemTemplateId,
        systemTemplateVersion: p.systemTemplateVersion,
        enableTools: p.enableTools,
        enableRag: p.enableRag,
        safetyLevel: p.safetyLevel,
        createdAt: p.createdAt.toISOString()
      }))
    });
  });

  // Create
  app.post('/orgs/:orgId/chat-profiles', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat-profiles:write'
    );

    const parsed = createProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const data = parsed.data;
    const slugBase = slugify(data.name, { lower: true, strict: true });

    // ensure slug uniqueness
    let slug = slugBase || 'profile';
    let attempt = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const exists = await prisma.chatProfile.findFirst({ where: { slug } });
      if (!exists) break;
      attempt += 1;
      slug = `${slugBase}-${attempt}`;
    }

    if (data.isDefault) {
      // unset previous defaults
      await prisma.chatProfile.updateMany({
        where: { orgId, isDefault: true },
        data: { isDefault: false }
      });
    }

    const profile = await prisma.chatProfile.create({
      data: {
        orgId,
        name: data.name,
        slug,
        description: data.description ?? null,
        isShared: data.isShared ?? true,
        isDefault: data.isDefault ?? false,
        modelProvider: data.modelProvider,
        modelName: data.modelName,
        temperature: data.temperature ?? 0.7,
        topP: data.topP ?? 1.0,
        maxTokens: typeof data.maxTokens === 'number' ? data.maxTokens : null,
        systemTemplateId: data.systemTemplateId ?? null,
        systemTemplateVersion: data.systemTemplateVersion ?? null,
        enableTools: data.enableTools ?? true,
        enableRag: data.enableRag ?? false,
        safetyLevel: data.safetyLevel ?? 'standard',
        providerConfig: data.providerConfig ?? {},
        createdById: payload.userId
      }
    });

    // Optional: emitEvent('chat_profile.created', ...)

    return reply.code(201).send({
      profile: {
        id: profile.id,
        orgId: profile.orgId,
        name: profile.name,
        slug: profile.slug,
        description: profile.description,
        isShared: profile.isShared,
        isDefault: profile.isDefault,
        modelProvider: profile.modelProvider,
        modelName: profile.modelName,
        temperature: profile.temperature,
        topP: profile.topP,
        maxTokens: profile.maxTokens,
        systemTemplateId: profile.systemTemplateId,
        systemTemplateVersion: profile.systemTemplateVersion,
        enableTools: profile.enableTools,
        enableRag: profile.enableRag,
        safetyLevel: profile.safetyLevel,
        createdAt: profile.createdAt.toISOString()
      }
    });
  });

  // Update
  app.patch(
    '/orgs/:orgId/chat-profiles/:profileId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, profileId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:chat-profiles:write'
      );

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const data = parsed.data;

      if (data.isDefault === true) {
        await prisma.chatProfile.updateMany({
          where: { orgId, isDefault: true },
          data: { isDefault: false }
        });
      }

      await prisma.chatProfile.updateMany({
        where: { id: profileId, orgId },
        data: {
          name: data.name ?? undefined,
          description: data.description ?? undefined,
          isShared: typeof data.isShared === 'boolean' ? data.isShared : undefined,
          isDefault: typeof data.isDefault === 'boolean' ? data.isDefault : undefined,
          modelProvider: data.modelProvider ?? undefined,
          modelName: data.modelName ?? undefined,
          temperature: typeof data.temperature === 'number' ? data.temperature : undefined,
          topP: typeof data.topP === 'number' ? data.topP : undefined,
          maxTokens:
            typeof data.maxTokens === 'number' ? data.maxTokens : data.maxTokens === null ? null : undefined,
          systemTemplateId: data.systemTemplateId !== undefined ? data.systemTemplateId : undefined,
          systemTemplateVersion:
            data.systemTemplateVersion !== undefined ? data.systemTemplateVersion : undefined,
          enableTools: typeof data.enableTools === 'boolean' ? data.enableTools : undefined,
          enableRag: typeof data.enableRag === 'boolean' ? data.enableRag : undefined,
          safetyLevel: data.safetyLevel ?? undefined,
          providerConfig: data.providerConfig ?? undefined
        }
      });

      return reply.send({ ok: true });
    }
  );

  // Delete
  app.delete(
    '/orgs/:orgId/chat-profiles/:profileId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, profileId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:chat-profiles:write'
      );

      await prisma.chatProfile.deleteMany({ where: { id: profileId, orgId } });

      return reply.send({ ok: true });
    }
  );
}
