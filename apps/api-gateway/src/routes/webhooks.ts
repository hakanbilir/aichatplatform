// apps/api-gateway/src/routes/webhooks.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';

const webhookBodySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  url: z.string().url(),
  eventTypes: z.array(z.string()).optional(),
  integrationId: z.string().optional() // Optional: link to existing integration
});

const updateWebhookBodySchema = webhookBodySchema.partial().extend({
  isActive: z.boolean().optional()
});

export default async function webhooksRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List webhooks for an org (via integrations)
  app.get('/orgs/:orgId/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:integrations:read'
    );

    // Get webhooks via org integrations
    const integrations = await prisma.orgIntegration.findMany({
      where: { orgId, isEnabled: true },
      include: {
        webhookSubscriptions: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    const webhooks = integrations.flatMap((int: { webhookSubscriptions: Array<{ id: string; url: string; eventTypes: unknown; isActive: boolean; createdAt: Date; updatedAt: Date }>; config: unknown }) => {
      return int.webhookSubscriptions.map((wh: { id: string; url: string; eventTypes: unknown; isActive: boolean; createdAt: Date; updatedAt: Date }) => ({
        id: wh.id,
        orgId,
        name: (int.config as any)?.name || wh.url, // Use name from integration config or fallback to URL
        description: (int.config as any)?.description || null,
        url: wh.url,
        eventTypes: wh.eventTypes as string[],
        isEnabled: wh.isActive,
        createdAt: wh.createdAt.toISOString(),
        updatedAt: wh.updatedAt.toISOString()
      }));
    });

    return reply.send({ webhooks });
  });

  // Create webhook (creates integration if needed)
  app.post('/orgs/:orgId/webhooks', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:integrations:write'
    );

    const parsed = webhookBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const secret = crypto.randomBytes(32).toString('hex');

    // Find or create integration
    let integration = parsed.data.integrationId
      ? await prisma.orgIntegration.findFirst({
          where: { id: parsed.data.integrationId, orgId }
        })
      : null;

    if (!integration) {
      // First find or create the webhook provider
      let provider = await prisma.integrationProvider.findFirst({
        where: { key: 'webhook' }
      });
      if (!provider) {
        provider = await prisma.integrationProvider.create({
          data: {
            key: 'webhook',
            name: 'Webhook',
            description: 'Generic webhook integration'
          }
        });
      }
      
      // Create a default webhook integration with name/description in config
      integration = await prisma.orgIntegration.create({
        data: {
          orgId,
          providerId: provider.id,
          name: parsed.data.name || 'Webhook Integration',
          credentials: {} as unknown as Prisma.InputJsonValue,
          config: {
            name: parsed.data.name,
            description: parsed.data.description ?? null
          } as unknown as Prisma.InputJsonValue,
          isEnabled: true
        }
      });
    } else {
      // Update integration config with name/description
      await prisma.orgIntegration.update({
        where: { id: integration.id },
        data: {
          config: {
            ...((integration.config as any) || {}),
            name: parsed.data.name,
            description: parsed.data.description ?? null
          }
        }
      });
    }

    const webhook = await prisma.webhookSubscription.create({
      data: {
        orgIntegrationId: integration.id,
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes ?? [],
        secret,
        isActive: true
      }
    });

    // Return webhook with name/description from request (stored in integration config or metadata)
    return reply.code(201).send({
      webhook: {
        id: webhook.id,
        orgId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        url: webhook.url,
        eventTypes: webhook.eventTypes as string[],
        isEnabled: webhook.isActive,
        createdAt: webhook.createdAt.toISOString(),
        updatedAt: webhook.updatedAt.toISOString()
      }
    });
  });

  // Update webhook
  app.patch('/orgs/:orgId/webhooks/:webhookId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;
    const webhookId = (request.params as any).webhookId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:integrations:write'
    );

    const parsed = updateWebhookBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    // Verify webhook belongs to org
    const webhook = await prisma.webhookSubscription.findFirst({
      where: {
        id: webhookId,
        orgIntegration: { orgId }
      }
    });

    if (!webhook) {
      return reply.code(404).send({ error: request.i18n.t('errors.webhookNotFound') });
    }

    const updated = await prisma.webhookSubscription.update({
      where: { id: webhookId },
      data: {
        url: parsed.data.url,
        eventTypes: parsed.data.eventTypes,
        isActive: parsed.data.isActive ?? webhook.isActive
      },
      include: {
        orgIntegration: true
      }
    });

    // Update integration config if name/description provided
    if (parsed.data.name || parsed.data.description !== undefined) {
      const integration = await prisma.orgIntegration.findUnique({
        where: { id: webhook.orgIntegrationId }
      });
      if (integration) {
      await prisma.orgIntegration.update({
        where: { id: webhook.orgIntegrationId },
        data: {
          config: {
              ...((integration.config as any) || {}),
            name: parsed.data.name,
            description: parsed.data.description
          }
        }
      });
      }
    }

    const integration = await prisma.orgIntegration.findUnique({
      where: { id: webhook.orgIntegrationId }
    });

    return reply.send({
      webhook: {
        id: updated.id,
        orgId,
        name: (integration?.config as any)?.name || updated.url,
        description: (integration?.config as any)?.description || null,
        url: updated.url,
        eventTypes: updated.eventTypes as string[],
        isEnabled: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString()
      }
    });
  });

  // Delete webhook
  app.delete('/orgs/:orgId/webhooks/:webhookId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;
    const webhookId = (request.params as any).webhookId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:integrations:write'
    );

    // Verify webhook belongs to org
    const webhook = await prisma.webhookSubscription.findFirst({
      where: {
        id: webhookId,
        orgIntegration: { orgId }
      }
    });

    if (!webhook) {
      return reply.code(404).send({ error: request.i18n.t('errors.webhookNotFound') });
    }

    await prisma.webhookSubscription.delete({
      where: { id: webhookId }
    });

    return reply.send({ ok: true });
  });
}

