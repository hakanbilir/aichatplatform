
import { describe, it, expect, mock } from 'bun:test';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        update: mock(() => Promise.resolve({ id: '1', role: 'ADMIN', orgId: 'other_org' })),
        delete: mock(() => Promise.resolve({ id: '1' })),
        findUnique: mock((args) => {
            if (args.where.id === 'member_of_other_org') {
                return Promise.resolve({ id: 'member_of_other_org', orgId: 'other_org' });
            }
            return Promise.resolve({ id: 'member_of_this_org', orgId: 'this_org' });
        }),
      },
      organization: {
        findUnique: mock(() => Promise.resolve({ id: 'org_id' })),
      }
    }
  };
});

// Mock guards
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('OWNER')),
    getUserOrgRole: mock(() => Promise.resolve('OWNER')),
  };
});

import fastify from 'fastify';
import orgRoutes from '../src/routes/orgs';

describe('IDOR Fix Verification', () => {
  it('should prevent updating member of another org', async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    // Mock i18n
    // Use getter to avoid FST_ERR_DEC_REFERENCE_TYPE
    app.decorateRequest('i18n', {
        getter() {
            return { t: (key: string) => key };
        }
    });

    await app.register(orgRoutes);

    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/this_org/members/member_of_other_org',
      payload: { role: 'ADMIN' }
    });

    // After fix, it should return 404
    expect(response.statusCode).toBe(404);

    if (response.statusCode === 404) {
        console.log("✅ FIX VERIFIED: Request rejected with 404.");
    } else {
        console.log(`❌ FIX FAILED: Status ${response.statusCode}`);
    }
  });

  it('should prevent deleting member of another org', async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
        getter() {
            return { t: (key: string) => key };
        }
    });

    await app.register(orgRoutes);

    const response = await app.inject({
      method: 'DELETE',
      url: '/orgs/this_org/members/member_of_other_org'
    });

    // After fix, it should return 404
    expect(response.statusCode).toBe(404);

    if (response.statusCode === 404) {
        console.log("✅ FIX VERIFIED (DELETE): Request rejected with 404.");
    }
  });
});
