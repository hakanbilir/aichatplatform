// apps/api-gateway/src/routes/exports.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { prisma } from '@ai-chat/db';
import { createConversationExportJob } from '../exports/service';

const exportBodySchema = z.object({
  format: z.enum(['jsonl', 'markdown', 'html'])
});

export default async function exportsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Create export
  app.post('/orgs/:orgId/conversations/:conversationId/export', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, conversationId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:read'
    );

    // Check if exports are allowed for this org (based on billing plan limits)
    // Bu org için dışa aktarmaların izinli olup olmadığını kontrol et (faturalama planı limitlerine göre)
    const subscription = await prisma.orgSubscription.findFirst({
      where: { orgId, status: 'active' },
      include: { plan: true }
    });

    // Exports are enabled by default. Only block if explicitly disabled in plan limits.
    // Dışa aktarmalar varsayılan olarak etkindir. Yalnızca plan limitlerinde açıkça devre dışı bırakılmışsa engelle.
    let exportsAllowed = true;
    if (subscription?.plan) {
      const limits = (subscription.plan.limits as Record<string, any>) || {};
      // Check if exports_allowed is explicitly set to false
      // exports_allowed açıkça false olarak ayarlanmışsa kontrol et
      if (typeof limits.exports_allowed === 'boolean' && !limits.exports_allowed) {
        exportsAllowed = false;
      }
    }

    if (!exportsAllowed) {
      return reply.code(403).send({ error: request.i18n.t('errors.exportsDisabled') || 'Exports are disabled for this organization' });
    }

    const bodyParsed = exportBodySchema.safeParse(request.body);
    if (!bodyParsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: bodyParsed.error.format() });
    }

    // Optional: ensure user can access this conversation specifically.
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        orgId
      }
    });

    if (!conversation) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    const job = await createConversationExportJob({
      orgId,
      requestedBy: payload.userId,
      conversationId,
      format: bodyParsed.data.format
    });

    return reply.code(202).send({ exportId: job.id, status: job.status });
  });

  // Get export status & metadata
  app.get('/orgs/:orgId/exports/:exportId', {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, exportId } = request.params as any;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:chat:read'
    );

    const job = await prisma.conversationExport.findFirst({
      where: {
        id: exportId,
        orgId
      }
    });

    if (!job) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    return reply.send({
      id: job.id,
      status: job.status,
      format: job.format,
      fileUrl: job.status === 'completed' ? job.storageKey : null, // Use storageKey as fileUrl
      metadata: {} // Metadata not in schema
    });
  });
}

