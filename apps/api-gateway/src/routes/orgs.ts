// apps/api-gateway/src/routes/orgs.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { assertOrgPermission, getUserOrgRole } from '../rbac/guards';

const createOrgBodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
});

const updateOrgBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
});

export default async function orgRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // List orgs the user belongs to
  // Kullanıcının ait olduğu org'ları listele
  app.get('/orgs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const memberships = await prisma.orgMember.findMany({
      where: { userId: payload.userId },
      include: {
        org: true,
      },
    });

    const orgs = memberships.map((m: { org: { id: string; name: string; slug: string | null }; role: string }) => ({
      id: m.org.id,
      name: m.org.name,
      slug: m.org.slug,
      role: m.role,
    }));

    return reply.send({ organizations: orgs });
  });

  // Create new org (any authenticated user can create an org; they become OWNER)
  // Yeni org oluştur (herhangi bir kimlik doğrulanmış kullanıcı org oluşturabilir; OWNER olurlar)
  app.post('/orgs', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const parseBody = createOrgBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgData'), details: parseBody.error.format() });
    }

    const { name, slug: providedSlug } = parseBody.data;

    const orgSlugBase = providedSlug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let slug = orgSlugBase || 'workspace';
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existingOrg = await prisma.organization.findUnique({ where: { slug } });
      if (!existingOrg) break;
      slug = `${orgSlugBase}-${suffix++}`;
    }

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        members: {
          create: {
            userId: payload.userId,
            role: 'OWNER',
          },
        },
      },
    });

    return reply.code(201).send({
      id: org.id,
      name: org.name,
      slug: org.slug,
    });
  });

  // Get org details (must have org:read)
  // Org detaylarını al (org:read yetkisi gerekir)
  app.get('/orgs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }

    const orgId = parseParams.data.id;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:read',
    );

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!org) {
      return reply.code(404).send({ error: request.i18n.t('errors.orgNotFound') });
    }

    return reply.send({
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    });
  });

  // Update org metadata (must have org:update)
  // Org metadata'sını güncelle (org:update yetkisi gerekir)
  app.patch('/orgs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }

    const orgId = parseParams.data.id;

    const parseBody = updateOrgBodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgUpdate'), details: parseBody.error.format() });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:update',
    );

    const data: any = {};
    if (parseBody.data.name !== undefined) data.name = parseBody.data.name;
    if (parseBody.data.slug !== undefined) {
      // Check slug uniqueness
      // Slug benzersizliğini kontrol et
      const existing = await prisma.organization.findUnique({ where: { slug: parseBody.data.slug } });
      if (existing && existing.id !== orgId) {
        return reply.code(409).send({ error: request.i18n.t('errors.slugTaken') });
      }
      data.slug = parseBody.data.slug;
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return reply.send({
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  });

  // Delete org (must be OWNER, or SUPERADMIN)
  // Org'u sil (OWNER veya SUPERADMIN olmalı)
  app.delete('/orgs/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }

    const orgId = parseParams.data.id;

    if (!payload.isSuperadmin) {
      const role = await getUserOrgRole(payload.userId, orgId);
      if (role !== 'OWNER') {
        return reply.code(403).send({ error: request.i18n.t('errors.onlyOwnerCanDelete') });
      }
    }

    await prisma.organization.delete({ where: { id: orgId } });

    return reply.code(204).send();
  });

  // List members (member:list)
  // Üyeleri listele (member:list)
  app.get('/orgs/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }

    const orgId = parseParams.data.id;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'member:list',
    );

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: true,
      },
    });

    return reply.send({
      members: members.map((m: { id: string; userId: string; user: { email: string; name: string | null }; role: string }) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
      })),
    });
  });

  // Invite/add member (member:invite)
  // Üye davet et/ekle (member:invite)
  app.post('/orgs/:id/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({ id: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgIdParam') });
    }

    const orgId = parseParams.data.id;

    const bodySchema = z.object({
      userId: z.string().min(1),
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
    });

    const parseBody = bodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidMemberData'), details: parseBody.error.format() });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'member:invite',
    );

    const { userId, role } = parseBody.data;

    // Check if membership already exists
    // Üyelik zaten var mı kontrol et
    const existing = await prisma.orgMember.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
    });

    const membership = existing
      ? await prisma.orgMember.update({
          where: { id: existing.id },
          data: { role: role as any },
        })
      : await prisma.orgMember.create({
          data: {
            orgId,
            userId,
            role: role as any,
          },
        });

    return reply.code(201).send({
      id: membership.id,
      userId: membership.userId,
      role: membership.role,
    });
  });

  // Update member role (member:update)
  // Üye rolünü güncelle (member:update)
  app.patch('/orgs/:id/members/:memberId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({
      id: z.string().min(1),
      memberId: z.string().min(1),
    });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidParams') });
    }

    const orgId = parseParams.data.id;
    const memberId = parseParams.data.memberId;

    const bodySchema = z.object({
      role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']),
    });

    const parseBody = bodySchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidMemberUpdate'), details: parseBody.error.format() });
    }

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'member:update',
    );

    const updated = await prisma.orgMember.update({
      where: { id: memberId },
      data: {
        role: parseBody.data.role as any,
      },
    });

    return reply.send({
      id: updated.id,
      userId: updated.userId,
      role: updated.role,
    });
  });

  // Remove member (member:remove)
  // Üyeyi kaldır (member:remove)
  app.delete('/orgs/:id/members/:memberId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const paramsSchema = z.object({
      id: z.string().min(1),
      memberId: z.string().min(1),
    });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidParams') });
    }

    const orgId = parseParams.data.id;
    const memberId = parseParams.data.memberId;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'member:remove',
    );

    await prisma.orgMember.delete({ where: { id: memberId } });

    return reply.code(204).send();
  });
}
