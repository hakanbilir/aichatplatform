// apps/api-gateway/src/routes/sharing.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';
import { generateSlug, hashPassphrase, verifyPassphrase } from '../sharing/utils';

const createShareBodySchema = z.object({
  expiresAt: z.string().datetime().optional(),
  passphrase: z.string().min(4).max(128).optional(),
  anonymize: z.boolean().default(true),
  hiddenMessageIds: z.array(z.string()).optional()
});

const updateShareBodySchema = z.object({
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional(),
  anonymize: z.boolean().optional(),
  hiddenMessageIds: z.array(z.string()).optional()
});

export default async function sharingRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Create share link
  app.post('/orgs/:orgId/conversations/:conversationId/share', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, conversationId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    // Note: Share links are enabled by default. Add org-level config if needed.
    // Not: Paylaşım bağlantıları varsayılan olarak etkindir. Gerekirse org düzeyinde yapılandırma ekleyin.

    const bodyParsed = createShareBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: bodyParsed.error.format() });
    }

    const conversation = await prisma.conversation.findFirst({ where: { id: conversationId, orgId } });
    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    const token = generateSlug();

    const passphraseHash = bodyParsed.data.passphrase
      ? await hashPassphrase(bodyParsed.data.passphrase)
      : null;

    // Store sharing config in conversation metadata
    const currentMetadata = (conversation.metadata as Record<string, unknown>) || {};
    const updatedMetadata = {
      ...currentMetadata,
      shareConfig: {
        anonymize: bodyParsed.data.anonymize,
        hiddenMessageIds: bodyParsed.data.hiddenMessageIds ?? []
      },
      ...(passphraseHash ? { passphraseHash } : {})
    };
    
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: updatedMetadata as unknown as Prisma.InputJsonValue }
    });

    const link = await prisma.conversationShareLink.create({
      data: {
        orgId,
        userId: payload.userId,
        conversationId,
        token,
        expiresAt: bodyParsed.data.expiresAt ? new Date(bodyParsed.data.expiresAt) : null,
        isActive: true,
        allowComments: false
      }
    });

    return reply.code(201).send({
      id: link.id,
      slug: link.token,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      anonymize: bodyParsed.data.anonymize,
      config: {
        hiddenMessageIds: bodyParsed.data.hiddenMessageIds ?? []
      }
    });
  });

  // Update / deactivate share link
  app.patch('/orgs/:orgId/share-links/:shareId', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, shareId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    const bodyParsed = updateShareBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: bodyParsed.error.format() });
    }

    const link = await prisma.conversationShareLink.findFirst({
      where: { id: shareId, orgId },
      include: { conversation: true }
    });
    
    if (!link) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    const updateData: any = {};
    if (bodyParsed.data.isActive !== undefined) updateData.isActive = bodyParsed.data.isActive;
    if (bodyParsed.data.expiresAt !== undefined) {
      updateData.expiresAt = bodyParsed.data.expiresAt ? new Date(bodyParsed.data.expiresAt) : null;
    }

    // Update conversation metadata if anonymize or hiddenMessageIds changed
    if (bodyParsed.data.anonymize !== undefined || bodyParsed.data.hiddenMessageIds !== undefined) {
      const currentMetadata = (link.conversation.metadata as Record<string, unknown>) || {};
      const shareConfig = (currentMetadata.shareConfig as Record<string, unknown>) || {};
      if (bodyParsed.data.anonymize !== undefined) shareConfig.anonymize = bodyParsed.data.anonymize;
      if (bodyParsed.data.hiddenMessageIds !== undefined) shareConfig.hiddenMessageIds = bodyParsed.data.hiddenMessageIds;
      
      await prisma.conversation.update({
        where: { id: link.conversationId },
        data: {
          metadata: {
            ...currentMetadata,
            shareConfig
          } as unknown as Prisma.InputJsonValue
        }
      });
    }

    const updateResult = await prisma.conversationShareLink.updateMany({
      where: { id: shareId, orgId },
      data: updateData
    });

    if (updateResult.count === 0) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    return reply.send({ ok: true });
  });

  // Delete share link
  app.delete('/orgs/:orgId/share-links/:shareId', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, shareId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:write'
    );

    await prisma.conversationShareLink.deleteMany({ where: { id: shareId, orgId } });
    return reply.send({ ok: true });
  });

  // Public view route (unauthenticated)
  app.post('/public/conversations/:slug', async (request, reply) => {
    const { slug } = request.params as any;
    const bodySchema = z.object({ passphrase: z.string().optional() });
    const bodyParsed = bodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: bodyParsed.error.format() });
    }

    const link = await prisma.conversationShareLink.findUnique({
      where: { token: slug }, // Use token field, route param is named slug for URL
      include: {
        conversation: {
          include: { messages: { orderBy: { createdAt: 'asc' } } }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!link || !link.isActive) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      return reply.code(410).send({ error: request.i18n.t('errors.expired') });
    }

    // Check for passphrase in conversation metadata if needed
    const convMetadata = (link.conversation.metadata as { passphraseHash?: string; hiddenMessageIds?: string[]; anonymize?: boolean }) || {};
    if (convMetadata.passphraseHash) {
      const provided = bodyParsed.data.passphrase || '';
      const valid = await verifyPassphrase(convMetadata.passphraseHash, provided);
      if (!valid) {
        return reply.code(403).send({ error: request.i18n.t('errors.invalidPassphrase') });
      }
    }

    const hiddenIds: string[] = convMetadata.hiddenMessageIds ?? [];
    const anonymize = convMetadata.anonymize || false;

    // Filter & anonymize messages for public view
    const messages = link.conversation.messages
      .filter((m: { id: string }) => !hiddenIds.includes(m.id))
      .map((m: { id: string; createdAt: Date; role: string; content: string }) => ({
        id: m.id,
        createdAt: m.createdAt.toISOString(),
        role: m.role,
        content: m.content
      }));

    return reply.send({
      slug: link.token, // Return token as slug for consistency
      title: link.conversation.title,
      createdAt: link.conversation.createdAt.toISOString(),
      createdBy: anonymize
        ? null
        : {
            id: link.user.id,
            displayName: link.user.name || link.user.email
          },
      messages
    });
  });
}

