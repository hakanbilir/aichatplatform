import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        findMany: mock((args) => {
          return Promise.resolve([{ orgId: 'org_1' }]);
        }),
      },
      conversation: {
        findFirst: mock((args) => {
          return Promise.resolve({
            id: 'conv_1',
            orgId: 'org_1',
            userId: 'user_1',
          });
        }),
        findUnique: mock((args) => {
          return Promise.resolve({
            id: 'conv_1',
            orgId: 'org_1',
            userId: 'user_1',
          });
        }),
      },
      message: {
        findMany: mock((args) => {
          // Old implementation mock (should NOT be called if optimized)
          throw new Error('prisma.message.findMany should not be called');
        }),
      },
      $queryRaw: mock((query, ...values) => {
        // Verify query contains expected parts
        // The query is a TemplateStringsArray if using tagged template literal
        // or just a string if passed directly?
        // Prisma.$queryRaw is usually called as a tagged template: prisma.$queryRaw`SELECT ...`
        // In that case, the first arg is TemplateStringsArray.
        // Return simulated aggregation result
        // Note: SUM and COUNT in Postgres return BigInts usually, but depending on driver setup.
        // We will simulate BigInts to ensure our code handles them.
        return Promise.resolve([
          {
            promptTokens: 100n, // BigInt
            completionTokens: 200n, // BigInt
            completions: 10n, // BigInt
            lastMessageAt: new Date('2023-01-01T12:00:00Z'),
          },
        ]);
      }),
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
    assertOrgPermission: mock(() => Promise.resolve('MEMBER')),
    getUserOrgRole: mock(() => Promise.resolve('MEMBER')),
    userHasOrgPermission: mock(() => Promise.resolve(true)),
  };
});
// Mock emitter
mock.module('../src/events/emitter', () => {
  return {
    emitEvent: mock(() => Promise.resolve()),
  };
});
// Mock llm service
mock.module('../src/llm/modelRegistryService', () => {
  return {
    resolveModelForOrg: mock(() => Promise.resolve()),
  };
});
// Mock prompt render
mock.module('../src/promptStudio/render', () => {
  return {
    renderSystemPromptFromProfile: mock(() => Promise.resolve('')),
  };
});
import fastify from 'fastify';

import conversationsRoutes from '../src/routes/conversations';
describe('Usage Optimization', () => {
  const setupApp = async () => {
    const app = fastify();
    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user_1', isSuperadmin: false };
    });
    // Mock i18n
    app.decorateRequest('i18n', {
      getter() {
        return { t: (key: string) => key };
      },
    });
    await app.register(conversationsRoutes);
    return app;
  };
  it('GET /conversations/:id/usage should use aggregation query', async () => {
    const app = await setupApp();
    const response = await app.inject({
      method: 'GET',
      url: '/conversations/conv_1/usage',
    });
    console.log('Response body:', response.body);
    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);
    expect(json).toEqual({
      conversationId: 'conv_1',
      totals: {
        promptTokens: 100,
        completionTokens: 200,
        totalTokens: 300,
      },
      completions: 10,
      lastMessageAt: '2023-01-01T12:00:00.000Z',
    });
  });
});
