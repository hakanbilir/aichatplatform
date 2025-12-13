import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { hashPassword, verifyPassword } from '../auth/password';
import { JwtPayload } from '../auth/types';
import { generateRefreshToken, verifyRefreshToken, revokeRefreshToken } from '../auth/refreshToken';
import { writeAuditLog } from '../services/audit';
import { z } from 'zod';

const signupBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  orgName: z.string().min(1).optional(),
});

const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export default async function authRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.post('/auth/signup', async (request, reply) => {
    const parseResult = signupBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidSignupData'), details: parseResult.error.format() });
    }

    const { email, password, name, orgName } = parseResult.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: request.i18n.t('errors.userExists') });
    }

    const passwordHash = await hashPassword(password);

    const orgDisplayName = orgName ?? `${name}'s Workspace`;
    const orgSlugBase = orgDisplayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    // Ensure org slug uniqueness by appending a suffix if necessary
    // Gerekirse bir sonek ekleyerek org slug benzersizliğini sağla
    let slug = orgSlugBase || 'workspace';
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existingOrg = await prisma.organization.findUnique({ where: { slug } });
      if (!existingOrg) break;
      slug = `${orgSlugBase}-${suffix++}`;
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        orgMemberships: {
          create: {
            role: 'OWNER',
            org: {
              create: {
                name: orgDisplayName,
                slug,
              },
            },
          },
        },
      },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    const primaryMembership = user.orgMemberships[0];
    const activeOrg = primaryMembership?.org ?? null;

    const payload: JwtPayload = {
      userId: user.id,
      orgId: activeOrg?.id ?? null,
      isSuperadmin: user.isSuperadmin,
    };

    const token = app.jwt.sign(payload);
    const refreshTokenData = await generateRefreshToken(user.id);

    await writeAuditLog({
      orgId: activeOrg?.id ?? null,
      user: payload,
      action: 'auth.signup',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { email: user.email }
    });

    return reply.send({
      token,
      refreshToken: refreshTokenData.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin,
      },
      activeOrg: activeOrg
        ? {
            id: activeOrg.id,
            name: activeOrg.name,
            slug: activeOrg.slug,
          }
        : null,
    });
  });

  app.post('/auth/login', async (request, reply) => {
    const parseResult = loginBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidLoginData'), details: parseResult.error.format() });
    }

    const { email, password } = parseResult.data;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      return reply.code(401).send({ error: request.i18n.t('errors.invalidCredentials') });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.code(401).send({ error: request.i18n.t('errors.invalidCredentials') });
    }

    const primaryMembership = user.orgMemberships[0] ?? null;
    const activeOrg = primaryMembership?.org ?? null;

    const payload: JwtPayload = {
      userId: user.id,
      orgId: activeOrg?.id ?? null,
      isSuperadmin: user.isSuperadmin,
    };

    const token = app.jwt.sign(payload);
    const refreshTokenData = await generateRefreshToken(user.id);

    await writeAuditLog({
      orgId: activeOrg?.id ?? null,
      user: payload,
      action: 'auth.login',
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata: { email: user.email }
    });

    return reply.send({
      token,
      refreshToken: refreshTokenData.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin,
      },
      activeOrg: activeOrg
        ? {
            id: activeOrg.id,
            name: activeOrg.name,
            slug: activeOrg.slug,
          }
        : null,
      organizations: user.orgMemberships.map((m: { org: { id: string; name: string; slug: string }; role: string }) => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        role: m.role,
      })),
    });
  });

  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      return reply.code(401).send({ error: request.i18n.t('errors.userNotFound') });
    }

    const activeOrg = user.orgMemberships.find((m) => m.orgId === payload.orgId)?.org ?? null;

    return reply.send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperadmin: user.isSuperadmin,
      },
      activeOrg: activeOrg
        ? {
            id: activeOrg.id,
            name: activeOrg.name,
            slug: activeOrg.slug,
          }
        : null,
      organizations: user.orgMemberships.map((m: { org: { id: string; name: string; slug: string }; role: string }) => ({
        id: m.org.id,
        name: m.org.name,
        slug: m.org.slug,
        role: m.role,
      })),
    });
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parseResult = refreshTokenBodySchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidRefreshToken'), details: parseResult.error.format() });
    }

    const { refreshToken } = parseResult.data;

    const tokenData = await verifyRefreshToken(refreshToken);
    if (!tokenData) {
      return reply.code(401).send({ error: request.i18n.t('errors.expiredRefreshToken') });
    }

    const user = await prisma.user.findUnique({
      where: { id: tokenData.userId },
      include: {
        orgMemberships: {
          include: {
            org: true,
          },
        },
      },
    });

    if (!user) {
      return reply.code(401).send({ error: request.i18n.t('errors.userNotFound') });
    }

    const primaryMembership = user.orgMemberships[0] ?? null;
    const activeOrg = primaryMembership?.org ?? null;

    const payload: JwtPayload = {
      userId: user.id,
      orgId: activeOrg?.id ?? null,
      isSuperadmin: user.isSuperadmin,
    };

    const newToken = app.jwt.sign(payload);

    return reply.send({
      token: newToken,
    });
  });

  app.post('/auth/logout', { preHandler: [app.authenticate] }, async (request, reply) => {
    const parseResult = refreshTokenBodySchema.safeParse(request.body);
    if (parseResult.success) {
      await revokeRefreshToken(parseResult.data.refreshToken);
    }

    return reply.send({ ok: true });
  });
}

