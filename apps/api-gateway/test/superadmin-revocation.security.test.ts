
import { describe, it, expect, mock } from 'bun:test';
import fastify from 'fastify';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      user: {
        findUnique: mock((args) => {
          // Return a user who is NOT a superadmin in the DB
          return Promise.resolve({
            id: 'admin_1',
            email: 'admin@example.com',
            name: 'Admin',
            isSuperadmin: false, // Revoked!
            orgMemberships: [],
            _count: { orgMemberships: 0, conversations: 0 }
          });
        }),
        findMany: mock(() => Promise.resolve([])),
        count: mock(() => Promise.resolve(0)),
      }
    }
  };
});

// Mock other dependencies
mock.module('../src/services/audit', () => ({
  writeAuditLog: mock(() => Promise.resolve())
}));

mock.module('../src/auth/password', () => ({
  hashPassword: mock(() => Promise.resolve('hashed')),
  verifyPassword: mock(() => Promise.resolve(true))
}));

// We need to import the routes AFTER mocking
import superadminRoutes from '../src/routes/superadmin';

describe('Superadmin Revocation Security', () => {
  const setupApp = async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req: any, reply: any) => {
      // Inject a stale JWT payload that still claims to be superadmin
      req.user = { userId: 'admin_1', isSuperadmin: true };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
        getter() {
            return { t: (key: string) => key };
        }
    });

    await app.register(superadminRoutes);
    return app;
  };

  it('SECURE: Revoked Superadmin CANNOT access superadmin routes even with valid token', async () => {
    const app = await setupApp();

    const response = await app.inject({
      method: 'GET',
      url: '/superadmin/users',
      query: { page: '1', limit: '10' }
    });

    console.log('Status code:', response.statusCode);

    // This assertion expects the secure behavior (403 Forbidden).
    // Before the fix, this test is expected to FAIL (receiving 200 OK),
    // proving the existence of the vulnerability.
    expect(response.statusCode).toBe(403);
  });
});
