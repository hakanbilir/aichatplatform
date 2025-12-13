// apps/api-gateway/src/routes/orgBranding.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { writeAuditLog } from '../services/audit';

const brandingSchema = z.object({
  displayName: z.string().max(128).nullable().optional(),
  logoUrl: z.string().url().max(1024).nullable().optional(),
  faviconUrl: z.string().url().max(1024).nullable().optional(),
  primaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).nullable().optional(),
  secondaryColor: z.string().regex(/^#([0-9a-fA-F]{6})$/).nullable().optional(),
  backgroundGradient: z.string().max(2048).nullable().optional(),
  fontFamily: z.string().max(128).nullable().optional(),
  themeTokens: z.record(z.any()).nullable().optional(),
  hideGlobalBranding: z.boolean().optional(),
  footerText: z.string().max(512).nullable().optional(),
  footerLinks: z.array(z.object({ label: z.string(), url: z.string() })).nullable().optional(),
  showLogoOnChat: z.boolean().optional()
});

export default async function orgBrandingRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/orgs/:orgId/branding', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read'
    );

    const cfg = await prisma.orgBrandingConfig.findUnique({ where: { orgId } });
    return reply.send({ config: cfg });
  });

  app.put('/orgs/:orgId/branding', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write'
    );

    const parsed = brandingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const cfg = await prisma.orgBrandingConfig.upsert({
      where: { orgId },
      update: {
        displayName: parsed.data.displayName ?? undefined,
        logoUrl: parsed.data.logoUrl ?? undefined,
        faviconUrl: parsed.data.faviconUrl ?? undefined,
        primaryColor: parsed.data.primaryColor ?? undefined,
        secondaryColor: parsed.data.secondaryColor ?? undefined,
        backgroundGradient: parsed.data.backgroundGradient ?? undefined,
        fontFamily: parsed.data.fontFamily ?? undefined,
        themeTokens: parsed.data.themeTokens ? (parsed.data.themeTokens as any) : undefined,
        hideGlobalBranding:
          typeof parsed.data.hideGlobalBranding === 'boolean'
            ? parsed.data.hideGlobalBranding
            : undefined,
        footerText: parsed.data.footerText ?? undefined,
        footerLinks: parsed.data.footerLinks ? (parsed.data.footerLinks as any) : undefined,
        showLogoOnChat:
          typeof parsed.data.showLogoOnChat === 'boolean'
            ? parsed.data.showLogoOnChat
            : undefined
      },
      create: {
        orgId,
        displayName: parsed.data.displayName ?? null,
        logoUrl: parsed.data.logoUrl ?? null,
        faviconUrl: parsed.data.faviconUrl ?? null,
        primaryColor: parsed.data.primaryColor ?? null,
        secondaryColor: parsed.data.secondaryColor ?? null,
        backgroundGradient: parsed.data.backgroundGradient ?? null,
        fontFamily: parsed.data.fontFamily ?? null,
        themeTokens: parsed.data.themeTokens ? (parsed.data.themeTokens as any) : null,
        hideGlobalBranding: parsed.data.hideGlobalBranding ?? false,
        footerText: parsed.data.footerText ?? null,
        footerLinks: parsed.data.footerLinks ? (parsed.data.footerLinks as any) : null,
        showLogoOnChat: parsed.data.showLogoOnChat ?? true
      }
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'org.branding_updated',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { displayName: parsed.data.displayName, logoUrl: parsed.data.logoUrl }
    });

    return reply.send({ config: cfg });
  });

  // Custom domains (47.md)
  app.get('/orgs/:orgId/branding/domains', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:read'
    );

    const domains = await prisma.orgDomain.findMany({ where: { orgId } });
    return reply.send({ domains });
  });

  app.post('/orgs/:orgId/branding/domains', { preHandler: [app.authenticate] }, async (req, reply) => {
    const payload = req.user as JwtPayload;
    const orgId = (req.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:write'
    );

    const parsed = z.object({ hostname: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
    }

    const domain = await prisma.orgDomain.create({
      data: {
        orgId,
        hostname: parsed.data.hostname,
        isVerified: false,
        isPrimary: false
      }
    });

    return reply.code(201).send({ domain });
  });

  app.delete(
    '/orgs/:orgId/branding/domains/:domainId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, domainId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:settings:write'
      );

      await prisma.orgDomain.deleteMany({ where: { id: domainId, orgId } });
      return reply.send({ ok: true });
    }
  );
}

