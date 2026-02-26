import { describe, it, expect, mock, beforeAll } from 'bun:test';
import fastify from 'fastify';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgApiKey: {
        findMany: mock(() => Promise.resolve([])),
        create: mock((args: any) => Promise.resolve({ id: 'key_escalation', ...args.data })),
        updateMany: mock(() => Promise.resolve({ count: 1 })),
        deleteMany: mock(() => Promise.resolve({ count: 1 })),
      },
    },
  };
});

// Mock guards - Return 'ADMIN' to simulate an Admin user
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('ADMIN')),
  };
});

// Mock audit log
mock.module('../src/services/audit', () => {
  return {
    writeAuditLog: mock(() => Promise.resolve()),
  };
});

// Mock apiKeys utils
mock.module('../src/apiKeys/utils', () => {
  return {
    generateOrgApiKey: mock(() => ({ raw: 'sk-test-123', hash: 'hash-123' })),
  };
});

import orgApiKeysRoutes from '../src/routes/orgApiKeys';

describe('Org API Keys Privilege Escalation Security', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req: any, reply: any) => {
      req.user = { userId: 'admin-user', isSuperadmin: false };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });

    await app.register(orgApiKeysRoutes);
  });

  it('should prevent ADMIN from creating API key with OWNER-only scopes', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_id/admin/api-keys',
      payload: {
        name: 'Escalation Key',
        // 'org:billing:write' is an OWNER-only permission. ADMIN does not have it.
        scopes: ['org:read', 'org:billing:write'],
      },
    });

    // Currently this passes (201), but we want it to fail (403)
    // We expect 403 Forbidden because ADMIN should not be able to grant permissions they don't have.
    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.payload);
    expect(body.error).toBe('errors.unauthorizedScope');
  });

  it('should prevent ADMIN from updating API key to have OWNER-only scopes', async () => {
    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/api-keys/key_escalation',
      payload: {
        scopes: ['org:billing:write'],
      },
    });

    expect(response.statusCode).toBe(403);
  });
});
