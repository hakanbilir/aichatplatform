import { describe, it, expect, mock, beforeEach } from 'bun:test';
import fastify from 'fastify';

// Setup mocks BEFORE importing routes
const mockUpdateMany = mock(() => Promise.resolve({ count: 1 }));
const mockUpdate = mock(() => Promise.resolve({ id: 'member_1', role: 'VIEWER' }));
const mockFindUnique = mock(() =>
  Promise.resolve({
    id: 'member_1',
    userId: 'target_owner_id',
    orgId: 'org_id',
    role: 'OWNER',
  }),
);

mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        updateMany: mockUpdateMany,
        findUnique: mockFindUnique,
        update: mockUpdate,
        findMany: mock(() => Promise.resolve([])),
      },
      orgInvitation: {
        findMany: mock(() => Promise.resolve([])),
      },
      user: {
        findUnique: mock(() => Promise.resolve({ id: 'user1' })),
      },
      organization: {
        findUnique: mock(() => Promise.resolve({ id: 'org_id' })),
      },
    },
  };
});

mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('ADMIN')),
    getUserOrgRole: mock(() => Promise.resolve('ADMIN')),
    userHasOrgPermission: mock(() => Promise.resolve(true)),
    assertSuperadmin: mock(() => Promise.resolve(true)),
  };
});

mock.module('../src/services/email', () => {
  return {
    sendInvitationEmail: mock(() => Promise.resolve()),
  };
});

mock.module('../src/services/audit', () => {
  return {
    writeAuditLog: mock(() => Promise.resolve()),
  };
});

// Import after mocks
import orgAdminMembersRoutes from '../src/routes/orgAdminMembers';

describe('Org Admin Privilege Escalation Security', () => {
  let app: any;

  beforeEach(() => {
    mockUpdateMany.mockClear();
    mockFindUnique.mockClear();
    mockUpdate.mockClear();

    app = fastify();
    app.decorate('authenticate', async (req: any, reply: any) => {
      req.user = { userId: 'admin_user', isSuperadmin: false };
    });
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });
    app.register(orgAdminMembersRoutes);
  });

  it('should prevent ADMIN from changing OWNER role to VIEWER', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/members/target_owner_id/role',
      payload: {
        role: 'VIEWER',
      },
    });

    // Currently this returns 200 because checks are missing
    if (response.statusCode === 200) {
      console.log('⚠️  Vulnerability Reproduced: ADMIN successfully demoted OWNER (Status 200)');
    }

    expect(response.statusCode).toBe(403);
    // expect(JSON.parse(response.body)).toEqual({ error: 'errors.onlyOwnerCanUpdateOwner' });
  });

  it('should prevent ADMIN from disabling OWNER account', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/members/target_owner_id/status',
      payload: {
        disabled: true,
      },
    });

    if (response.statusCode === 200) {
      console.log('⚠️  Vulnerability Reproduced: ADMIN successfully disabled OWNER (Status 200)');
    }

    expect(response.statusCode).toBe(403);
  });
});
