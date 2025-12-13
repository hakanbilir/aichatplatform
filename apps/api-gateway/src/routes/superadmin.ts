// apps/api-gateway/src/routes/superadmin.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { z } from 'zod';
import { hashPassword } from '../auth/password';
import { writeAuditLog } from '../services/audit';

// Schema definitions
// Şema tanımları
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  password: z.string().min(8),
  isSuperadmin: z.boolean().default(false),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  isSuperadmin: z.boolean().optional(),
  customInstructions: z.string().optional(),
});

const updateUserPasswordSchema = z.object({
  password: z.string().min(8),
});

const updateOrgPlanSchema = z.object({
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE', 'CUSTOM']),
  monthlySoftLimitTokens: z.number().int().positive().optional(),
  monthlyHardLimitTokens: z.number().int().positive().optional(),
});

const assignFreeSubscriptionSchema = z.object({
  orgId: z.string().min(1),
  monthlySoftLimitTokens: z.number().int().positive().optional(),
  monthlyHardLimitTokens: z.number().int().positive().optional(),
});

const paginationSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
});

/**
 * Verify that the requesting user is a superadmin.
 * İstek yapan kullanıcının süperadmin olduğunu doğrula.
 */
async function assertSuperadmin(payload: JwtPayload, i18n: any): Promise<void> {
  if (!payload.isSuperadmin) {
    const error = new Error(i18n.t('errors.superadminRequired'));
    (error as any).statusCode = 403;
    throw error;
  }
}

export default async function superadminRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  // ============================================
  // USER MANAGEMENT (CRUD)
  // KULLANICI YÖNETİMİ (CRUD)
  // ============================================

  // List all users (with pagination)
  // Tüm kullanıcıları listele (sayfalama ile)
  app.get('/superadmin/users', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const query = paginationSchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidPaginationParams'), details: query.error.format() });
    }

    const { page, limit } = query.data;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          isSuperadmin: true,
          customInstructions: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              orgMemberships: true,
              conversations: true,
            },
          },
        },
      }),
      prisma.user.count(),
    ]);

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.list',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { page, limit },
    });

    return reply.send({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        isSuperadmin: u.isSuperadmin,
        customInstructions: u.customInstructions,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        orgCount: u._count.orgMemberships,
        conversationCount: u._count.conversations,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Get user by ID
  // ID'ye göre kullanıcı al
  app.get('/superadmin/users/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ userId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserId') });
    }

    const { userId } = parseParams.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        orgMemberships: {
          include: {
            org: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({ error: request.i18n.t('errors.userNotFound') });
    }

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.read',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { targetUserId: userId },
    });

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperadmin: user.isSuperadmin,
      customInstructions: user.customInstructions,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      organizations: user.orgMemberships.map((m) => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        plan: m.org.plan,
        role: m.role,
        isDisabled: m.isDisabled,
        joinedAt: m.createdAt.toISOString(),
      })),
    });
  });

  // Create new user
  // Yeni kullanıcı oluştur
  app.post('/superadmin/users', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const parseBody = createUserSchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserData'), details: parseBody.error.format() });
    }

    const { email, name, password, isSuperadmin: isSuperadminFlag } = parseBody.data;

    // Check if user already exists
    // Kullanıcı zaten var mı kontrol et
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: request.i18n.t('errors.userExists') });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        isSuperadmin: isSuperadminFlag,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperadmin: true,
        createdAt: true,
      },
    });

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.create',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { targetUserId: user.id, email: user.email, isSuperadmin: isSuperadminFlag },
    });

    return reply.code(201).send({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperadmin: user.isSuperadmin,
      createdAt: user.createdAt.toISOString(),
    });
  });

  // Update user
  // Kullanıcıyı güncelle
  app.patch('/superadmin/users/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ userId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserId') });
    }

    const { userId } = parseParams.data;

    const parseBody = updateUserSchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserData'), details: parseBody.error.format() });
    }

    const updateData = parseBody.data;

    // Check if user exists
    // Kullanıcı var mı kontrol et
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return reply.code(404).send({ error: request.i18n.t('errors.userNotFound') });
    }

    // If email is being changed, check for conflicts
    // E-posta değiştiriliyorsa, çakışmaları kontrol et
    if (updateData.email && updateData.email !== existing.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email: updateData.email } });
      if (emailConflict) {
        return reply.code(409).send({ error: request.i18n.t('errors.userExists') });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.name !== undefined && { name: updateData.name }),
        ...(updateData.isSuperadmin !== undefined && { isSuperadmin: updateData.isSuperadmin }),
        ...(updateData.customInstructions !== undefined && { customInstructions: updateData.customInstructions }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperadmin: true,
        customInstructions: true,
        updatedAt: true,
      },
    });

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.update',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { targetUserId: userId, changes: updateData },
    });

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      isSuperadmin: user.isSuperadmin,
      customInstructions: user.customInstructions,
      updatedAt: user.updatedAt.toISOString(),
    });
  });

  // Delete user
  // Kullanıcıyı sil
  app.delete('/superadmin/users/:userId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ userId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserId') });
    }

    const { userId } = parseParams.data;

    // Prevent self-deletion
    // Kendi kendini silmeyi önle
    if (userId === payload.userId) {
      return reply.code(400).send({ error: request.i18n.t('errors.cannotDeleteOwnAccount') });
    }

    // Check if user exists
    // Kullanıcı var mı kontrol et
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return reply.code(404).send({ error: request.i18n.t('errors.userNotFound') });
    }

    await prisma.user.delete({ where: { id: userId } });

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.delete',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { targetUserId: userId, deletedEmail: existing.email },
    });

    return reply.code(204).send();
  });

  // ============================================
  // USER CREDENTIAL MANAGEMENT
  // KULLANICI KİMLİK BİLGİLERİ YÖNETİMİ
  // ============================================

  // Reset user password
  // Kullanıcı şifresini sıfırla
  app.post('/superadmin/users/:userId/reset-password', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ userId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidUserId') });
    }

    const { userId } = parseParams.data;

    const parseBody = updateUserPasswordSchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidPasswordData'), details: parseBody.error.format() });
    }

    const { password } = parseBody.data;

    // Check if user exists
    // Kullanıcı var mı kontrol et
    const existing = await prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      return reply.code(404).send({ error: request.i18n.t('errors.userNotFound') });
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.users.reset-password',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { targetUserId: userId, targetEmail: existing.email },
    });

    return reply.send({ message: request.i18n.t('errors.passwordResetSuccess') });
  });

  // ============================================
  // SUBSCRIPTION MANAGEMENT
  // ABONELİK YÖNETİMİ
  // ============================================

  // List all organizations with their plans
  // Tüm organizasyonları planlarıyla birlikte listele
  app.get('/superadmin/organizations', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const query = paginationSchema.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidPaginationParams'), details: query.error.format() });
    }

    const { page, limit } = query.data;
    const skip = (page - 1) * limit;

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              conversations: true,
            },
          },
        },
      }),
      prisma.organization.count(),
    ]);

    await writeAuditLog({
      orgId: null,
      user: payload,
      action: 'superadmin.organizations.list',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { page, limit },
    });

    return reply.send({
      organizations: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        plan: org.plan,
        monthlySoftLimitTokens: org.monthlySoftLimitTokens,
        monthlyHardLimitTokens: org.monthlyHardLimitTokens,
        memberCount: org._count.members,
        conversationCount: org._count.conversations,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // Update organization plan and limits
  // Organizasyon planını ve limitlerini güncelle
  app.patch('/superadmin/organizations/:orgId/plan', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgId') });
    }

    const { orgId } = parseParams.data;

    const parseBody = updateOrgPlanSchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidPlanData'), details: parseBody.error.format() });
    }

    const { plan, monthlySoftLimitTokens, monthlyHardLimitTokens } = parseBody.data;

    // Check if organization exists
    // Organizasyon var mı kontrol et
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      return reply.code(404).send({ error: request.i18n.t('errors.organizationNotFound') });
    }

    const updateData: any = { plan };
    if (monthlySoftLimitTokens !== undefined) {
      updateData.monthlySoftLimitTokens = monthlySoftLimitTokens;
    }
    if (monthlyHardLimitTokens !== undefined) {
      updateData.monthlyHardLimitTokens = monthlyHardLimitTokens;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'superadmin.organizations.update-plan',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        orgId,
        orgName: org.name,
        oldPlan: existing.plan,
        newPlan: plan,
        oldSoftLimit: existing.monthlySoftLimitTokens,
        newSoftLimit: monthlySoftLimitTokens,
        oldHardLimit: existing.monthlyHardLimitTokens,
        newHardLimit: monthlyHardLimitTokens,
      },
    });

    return reply.send({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      monthlySoftLimitTokens: org.monthlySoftLimitTokens,
      monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      updatedAt: org.updatedAt.toISOString(),
    });
  });

  // Give away free subscription to an organization
  // Bir organizasyona ücretsiz abonelik ver
  app.post('/superadmin/organizations/assign-free-subscription', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const parseBody = assignFreeSubscriptionSchema.safeParse(request.body);
    if (!parseBody.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidSubscriptionData'), details: parseBody.error.format() });
    }

    const { orgId, monthlySoftLimitTokens, monthlyHardLimitTokens } = parseBody.data;

    // Check if organization exists
    // Organizasyon var mı kontrol et
    const existing = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!existing) {
      return reply.code(404).send({ error: request.i18n.t('errors.organizationNotFound') });
    }

    const updateData: any = {
      plan: 'FREE',
    };

    // Set default limits if not provided
    // Sağlanmazsa varsayılan limitleri ayarla
    if (monthlySoftLimitTokens !== undefined) {
      updateData.monthlySoftLimitTokens = monthlySoftLimitTokens;
    } else if (existing.monthlySoftLimitTokens === null) {
      updateData.monthlySoftLimitTokens = 100000;
    }

    if (monthlyHardLimitTokens !== undefined) {
      updateData.monthlyHardLimitTokens = monthlyHardLimitTokens;
    } else if (existing.monthlyHardLimitTokens === null) {
      updateData.monthlyHardLimitTokens = 120000;
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
    });

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'superadmin.organizations.assign-free-subscription',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: {
        orgId,
        orgName: org.name,
        oldPlan: existing.plan,
        monthlySoftLimitTokens: org.monthlySoftLimitTokens,
        monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      },
    });

    return reply.send({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      monthlySoftLimitTokens: org.monthlySoftLimitTokens,
      monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      message: request.i18n.t('errors.freeSubscriptionAssigned'),
    });
  });

  // Get organization details with full information
  // Organizasyon detaylarını tam bilgiyle al
  app.get('/superadmin/organizations/:orgId', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    await assertSuperadmin(payload, request.i18n);

    const paramsSchema = z.object({ orgId: z.string().min(1) });
    const parseParams = paramsSchema.safeParse(request.params);
    if (!parseParams.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidOrgId') });
    }

    const { orgId } = parseParams.data;

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                isSuperadmin: true,
              },
            },
          },
        },
        _count: {
          select: {
            conversations: true,
            messages: true,
            files: true,
            knowledgeBases: true,
          },
        },
      },
    });

    if (!org) {
      return reply.code(404).send({ error: request.i18n.t('errors.organizationNotFound') });
    }

    await writeAuditLog({
      orgId,
      user: payload,
      action: 'superadmin.organizations.read',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { orgId },
    });

    return reply.send({
      id: org.id,
      name: org.name,
      slug: org.slug,
      description: org.description,
      plan: org.plan,
      monthlySoftLimitTokens: org.monthlySoftLimitTokens,
      monthlyHardLimitTokens: org.monthlyHardLimitTokens,
      members: org.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          isSuperadmin: m.user.isSuperadmin,
        },
        role: m.role,
        isDisabled: m.isDisabled,
        joinedAt: m.createdAt.toISOString(),
      })),
      counts: {
        conversations: org._count.conversations,
        messages: org._count.messages,
        files: org._count.files,
        knowledgeBases: org._count.knowledgeBases,
      },
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    });
  });
}

