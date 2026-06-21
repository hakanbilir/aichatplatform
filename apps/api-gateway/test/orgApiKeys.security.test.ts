import { describe, it, expect, mock } from 'bun:test';
// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgApiKey: {
        findMany: mock(() => Promise.resolve([])),
        create: mock((args: any) => Promise.resolve({ id: 'key_1', ...args.data })),
        updateMany: mock(() => Promise.resolve({ count: 1 })),
        deleteMany: mock(() => Promise.resolve({ count: 1 })),
      },
    },
    cleanupExpiredTokens: mock(() => Promise.resolve()),
    ensureDbExtensions: mock(() => Promise.resolve()),
    checkDbConnection: mock(() => Promise.resolve(true)),
    clearAllData: mock(() => Promise.resolve()),
    checkDbHealth: mock(() => Promise.resolve(true)),
    initializeDb: mock(() => Promise.resolve()),
    closeDb: mock(() => Promise.resolve()),
  };
});
// Mock guards
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('OWNER')),
    getUserOrgRole: mock(() => Promise.resolve('ADMIN')),
    userHasOrgPermission: mock(() => Promise.resolve(true)),
  };
});
// Mock audit log
mock.module('../src/services/audit', () => {
  return {
    writeAuditLog: mock(() => Promise.resolve()),
  };
});
import fastify from 'fastify';

import orgApiKeysRoutes from '../src/routes/orgApiKeys';
describe('Org API Keys Security', () => {
  it('should allow valid scopes', async () => {
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
    await app.register(orgApiKeysRoutes);
    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_id/admin/api-keys',
      payload: {
        name: 'Test Key',
        scopes: ['org:read', 'conversation:write'], // Valid scopes
      },
    });
    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('token');
  });
  it('should reject invalid scopes', async () => {
    const app = fastify();
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });
    await app.register(orgApiKeysRoutes);
    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_id/admin/api-keys',
      payload: {
        name: 'Test Key',
        scopes: ['org:read', 'invalid:scope'], // Invalid scope
      },
    });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    // Zod error structure
    expect(body.error).toBe('errors.invalidBody');
  });
  it('should reject update with invalid scopes', async () => {
    const app = fastify();
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });
    await app.register(orgApiKeysRoutes);
    const response = await app.inject({
      method: 'PATCH',
      url: '/orgs/org_id/admin/api-keys/key_1',
      payload: {
        scopes: ['super:admin:godmode'], // Invalid scope
      },
    });
    expect(response.statusCode).toBe(400);
  });
});
