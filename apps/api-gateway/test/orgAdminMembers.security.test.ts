import { describe, it, expect, mock } from 'bun:test';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        updateMany: mock(() => Promise.resolve({ count: 1 })),
        findMany: mock(() => Promise.resolve([])),
      },
      orgInvitation: {
        create: mock(() => Promise.resolve({ id: 'inv_1' })),
        findMany: mock(() => Promise.resolve([])),
      },
      user: {
        findUnique: mock(() =>
          Promise.resolve({ id: 'user1', name: 'User 1', email: 'user1@example.com' }),
        ),
      },
      organization: {
        findUnique: mock(() => Promise.resolve({ id: 'org_id', name: 'Org 1' })),
      },
    },
  };
});

// Mock guards
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('ADMIN')),
    getUserOrgRole: mock(() => Promise.resolve('ADMIN')),
  };
});

// Mock email service
mock.module('../src/services/email', () => {
  return {
    sendInvitationEmail: mock(() => Promise.resolve()),
  };
});

// Mock audit log
mock.module('../src/services/audit', () => {
  return {
    writeAuditLog: mock(() => Promise.resolve()),
  };
});

import fastify from 'fastify';
import orgAdminMembersRoutes from '../src/routes/orgAdminMembers';

describe('Org Admin Members Security', () => {
  it('should reject invalid roles in invite', async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });

    await app.register(orgAdminMembersRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_id/admin/members/invite',
      payload: {
        email: 'test@example.com',
        role: 'INVALID_ROLE',
        expiresInDays: 7,
      },
    });

    // Should be 400 Bad Request due to validation
    expect(response.statusCode).toBe(400);
  });

  it('should reject SUPERADMIN role in invite', async () => {
    const app = fastify();

    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });

    await app.register(orgAdminMembersRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_id/admin/members/invite',
      payload: {
        email: 'test@example.com',
        role: 'SUPERADMIN',
        expiresInDays: 7,
      },
    });

    // Should be 400 after fix (currently likely 201)
    if (response.statusCode === 201) {
      console.log('⚠️ Vulnerability confirmed: SUPERADMIN role accepted.');
    }
    expect(response.statusCode).toBe(400);
  });

  it('should reject invalid roles in update', async () => {
    const app = fastify();

    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });

    await app.register(orgAdminMembersRoutes);

    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/members/user_2/role',
      payload: {
        role: 'INVALID_ROLE',
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('should reject SUPERADMIN role in update', async () => {
    const app = fastify();

    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });

    await app.register(orgAdminMembersRoutes);

    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/members/user_2/role',
      payload: {
        role: 'SUPERADMIN',
      },
    });

    // Should be 400 after fix (currently likely 200)
    if (response.statusCode === 200) {
      console.log('⚠️ Vulnerability confirmed: SUPERADMIN role accepted in update.');
    }
    expect(response.statusCode).toBe(400);
  });
});
