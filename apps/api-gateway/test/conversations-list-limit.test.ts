import { describe, it, expect, mock } from 'bun:test';
import fastify from 'fastify';

import conversationsRoutes from '../src/routes/conversations';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        findMany: mock(() => Promise.resolve([])), // No org memberships
      },
      conversation: {
        findMany: mock((args) => {
          // Return empty array, but we can inspect args.take
          return Promise.resolve([]);
        }),
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
    assertOrgPermission: mock(() => Promise.resolve('MEMBER')),
    getUserOrgRole: mock(() => Promise.resolve('MEMBER')),
    userHasOrgPermission: mock(() => Promise.resolve(true)),
  };
});

// Mock dependencies
mock.module('../src/events/emitter', () => ({ emitEvent: mock(() => Promise.resolve()) }));
mock.module('../src/llm/modelRegistryService', () => ({
  resolveModelForOrg: mock(() => Promise.resolve()),
}));
mock.module('../src/promptStudio/render', () => ({
  renderSystemPromptFromProfile: mock(() => Promise.resolve('')),
}));

describe('Conversations List Limit', () => {
  const setupApp = async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'test_user', isSuperadmin: false };
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

  it('should use default limit of 100 when no limit provided', async () => {
    const app = await setupApp();
    const { prisma } = await import('@ai-chat/db');
    const findManySpy = prisma.conversation.findMany as unknown as ReturnType<typeof mock>;
    findManySpy.mockClear();

    await app.inject({
      method: 'GET',
      url: '/conversations',
    });

    expect(findManySpy).toHaveBeenCalled();
    const args = findManySpy.mock.calls[0][0];
    expect(args.take).toBe(100);
  });

  it('should use provided limit', async () => {
    const app = await setupApp();
    const { prisma } = await import('@ai-chat/db');
    const findManySpy = prisma.conversation.findMany as unknown as ReturnType<typeof mock>;
    findManySpy.mockClear();

    await app.inject({
      method: 'GET',
      url: '/conversations?limit=5',
    });

    expect(findManySpy).toHaveBeenCalled();
    const args = findManySpy.mock.calls[0][0];
    expect(args.take).toBe(5);
  });

  it('should cap limit at 100', async () => {
    const app = await setupApp();
    const { prisma } = await import('@ai-chat/db');
    const findManySpy = prisma.conversation.findMany as unknown as ReturnType<typeof mock>;
    findManySpy.mockClear();

    await app.inject({
      method: 'GET',
      url: '/conversations?limit=200',
    });

    expect(findManySpy).toHaveBeenCalled();
    const args = findManySpy.mock.calls[0][0];
    expect(args.take).toBe(100);
  });
});
