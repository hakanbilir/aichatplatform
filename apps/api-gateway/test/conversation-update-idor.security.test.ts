import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        findMany: mock((args) => {
          // Mock finding memberships
          return Promise.resolve([{ orgId: 'org_1' }]);
        }),
      },
      conversation: {
        findFirst: mock((args) => {
          // Return a conversation in the org, owned by someone else
          return Promise.resolve({
            id: 'conv_1',
            orgId: 'org_1',
            userId: 'user_owner', // Conversation Creator is NOT the attacker
            title: 'Original Title',
          });
        }),
        findUnique: mock((args) => {
          // Return a conversation in the org, owned by someone else
          return Promise.resolve({
            id: 'conv_1',
            orgId: 'org_1',
            userId: 'user_owner', // Conversation Creator is NOT the attacker
            title: 'Original Title',
          });
        }),
        update: mock(() =>
          Promise.resolve({
            id: 'conv_1',
            title: 'Hacked Title',
            orgId: 'org_1',
          }),
        ),
      },
      chatProfile: {
        findFirst: mock(() => Promise.resolve(null)),
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
    assertOrgPermission: mock(() => Promise.resolve('MEMBER')), // Requester is MEMBER
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
describe('Conversation Update IDOR Security', () => {
  const setupApp = async () => {
    const app = fastify();
    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'attacker_user', isSuperadmin: false }; // User is attacker
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
  it('SECURE: MEMBER CANNOT update conversation of another user in Org', async () => {
    const app = await setupApp();
    const response = await app.inject({
      method: 'PATCH',
      url: '/conversations/conv_1',
      payload: {
        title: 'Hacked Title',
      },
    });
    // Currently this returns 200 (VULNERABILITY), we want 403
    console.log('Status code:', response.statusCode);
    console.log('Response:', response.body);
    expect(response.statusCode).toBe(403);
  });
});
