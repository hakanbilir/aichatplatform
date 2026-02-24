// apps/api-gateway/src/routes/orgAdminMembers.ts

import crypto from 'node:crypto';

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';

import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { writeAuditLog } from '../services/audit';
import { sendInvitationEmail } from '../services/email';

const inviteBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  expiresInDays: z.number().int().min(1).max(60).default(7)
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'])
});

const toggleMemberStatusSchema = z.object({
  disabled: z.boolean()
});

export default async function orgAdminMembersRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/orgs/:orgId/admin/members', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:members:read'
    );

    const members = await prisma.orgMember.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        }
      }
    });

    const invitations = await prisma.orgInvitation.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' }
    });

    return reply.send({
      members: members.map((m: { user: { id: string; email: string; name: string | null; createdAt: Date }; role: string; isDisabled: boolean }) => ({
        id: m.user.id,
        email: m.user.email,
        displayName: m.user.name,
        role: m.role,
        status: m.isDisabled ? 'disabled' : 'active',
        joinedAt: m.user.createdAt.toISOString()
      })),
      invitations: invitations.map((inv: { id: string; email: string; role: string; status: string; createdAt: Date }) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status as any,
        createdAt: inv.createdAt.toISOString(),
        expiresAt: null // ExpiresAt not in schema
      }))
    });
  });

  // Invite
  app.post('/orgs/:orgId/admin/members/invite', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:members:write'
    );

    const parsed = inviteBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const { email, role, expiresInDays } = parsed.data;

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const inv = await prisma.orgInvitation.create({
      data: {
        orgId,
        email,
        role,
        invitedBy: payload.userId,
        token,
        status: 'pending',
        expiresAt
      }
    });

    // Send invitation email (non-blocking) / Davet e-postası gönder (engellemez)
    // Get org and inviter details for email / E-posta için org ve davet eden detaylarını al
    const [org, inviter] = await Promise.all([
      prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: payload.userId }, select: { name: true, email: true } })
    ]).catch(() => [null, null]);

    // Send email asynchronously, don't fail invitation if email fails
    // E-postayı asenkron gönder, e-posta başarısız olursa daveti başarısız sayma
    sendInvitationEmail(
      email,
      org?.name || 'Organization',
      inviter?.name || inviter?.email || 'A team member',
      token,
      expiresAt
    ).catch((err) => {
      // Log error but don't throw / Hatayı logla ama fırlatma
      request.log.warn({ err, email, orgId }, 'Failed to send invitation email');
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'org.member_invited',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { email, role }
    });

    return reply.code(201).send({ id: inv.id });
  });

  // Update role
  app.patch('/orgs/:orgId/admin/members/:userId/role', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, userId } = request.params as any;

    const requesterRole = await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:members:write'
    );

    const parsed = updateMemberRoleSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const member = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });

    if (!member) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    if (!payload.isSuperadmin) {
      if (member.role === 'OWNER' && requesterRole !== 'OWNER') {
        return reply.code(403).send({ error: request.i18n.t('errors.onlyOwnerCanUpdateOwner') });
      }
    }

    await prisma.orgMember.update({
      where: { id: member.id },
      data: { role: parsed.data.role as any }
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'org.member_role_changed',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { userId, newRole: parsed.data.role }
    });

    return reply.send({ ok: true });
  });

  // Enable / disable member
  app.patch('/orgs/:orgId/admin/members/:userId/status', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const { orgId, userId } = request.params as any;

    const requesterRole = await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:admin:members:write'
    );

    const parsed = toggleMemberStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const member = await prisma.orgMember.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });

    if (!member) {
      return reply.code(404).send({ error: request.i18n.t('errors.notFound') });
    }

    if (!payload.isSuperadmin) {
      if (member.role === 'OWNER' && requesterRole !== 'OWNER') {
        return reply.code(403).send({ error: request.i18n.t('errors.onlyOwnerCanUpdateOwner') });
      }
    }

    await prisma.orgMember.update({
      where: { id: member.id },
      data: { isDisabled: parsed.data.disabled }
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: parsed.data.disabled ? 'org.member_disabled' : 'org.member_enabled',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { userId }
    });

    return reply.send({ ok: true });
  });
}

