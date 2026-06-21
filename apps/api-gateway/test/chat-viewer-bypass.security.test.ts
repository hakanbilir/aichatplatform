import { describe, it, expect, mock, beforeAll } from 'bun:test';
import fastify from 'fastify';

import { roleHasPermission, OrgRole, OrgPermission } from '../src/rbac/roles';
// Mock Guards explicitly to prevent leakage from other tests and use real roles logic
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(async (user: any, orgId: string, permission: OrgPermission) => {
      // In this test, we assume user1 is VIEWER in org1
      // Ideally we'd fetch from DB but we are mocking DB too.
      // So we use the same assumption as the DB mock.
      const role: OrgRole = 'VIEWER';
      if (!roleHasPermission(role, permission)) {
        const error = new Error('Forbidden');
        (error as any).statusCode = 403;
        throw error;
      }
      return role;
    }),
    getUserOrgRole: mock(() => Promise.resolve('VIEWER')),
    userHasOrgPermission: mock(() => Promise.resolve(true)),
  };
});
// Mock DB
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgMember: {
        findMany: mock(() => Promise.resolve([{ orgId: 'org1', role: 'VIEWER' }])),
        // Used by userHasOrgPermission
        findFirst: mock((args) => {
          // If checking for membership to get role
          if (args?.where?.userId === 'user1' && args?.where?.orgId === 'org1') {
            return Promise.resolve({ role: 'VIEWER' });
          }
          return Promise.resolve(null);
        }),
      },
      conversation: {
        findUnique: mock(() => Promise.resolve({ id: 'conv1', orgId: 'org1', userId: 'user2' })),
      },
      message: {
        findMany: mock(() => Promise.resolve([])),
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
// Mock Chat Engine
mock.module('../src/services/chatEngine', () => {
  return {
    runConversationTurn: mock(() =>
      Promise.resolve({ usage: { promptTokens: 10, completionTokens: 10 } }),
    ),
    streamConversationTurn: mock(async function* () {
      yield { type: 'token', text: 'hi' };
    }),
  };
});
// Mock Events
mock.module('../src/events/emitter', () => {
  return {
    emitEvent: mock(() => Promise.resolve()),
  };
});
import chatRoutes from '../src/routes/chat';
describe('Chat Authorization Bypass Check', () => {
  it('should verify if VIEWER can send messages (Vulnerability Reproduction)', async () => {
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
    await app.register(chatRoutes);
    const response = await app.inject({
      method: 'POST',
      url: '/conversations/conv1/messages',
      payload: { content: 'Hello' },
    });
    // Currently expect 200 because the vulnerability exists
    if (response.statusCode === 200) {
      console.log('🚨 VULNERABILITY REPRODUCED: VIEWER can send messages.');
    } else if (response.statusCode === 403) {
      console.log('✅ ACCESS DENIED: VIEWER cannot send messages.');
    } else {
      console.log(`ℹ️ Unexpected status: ${response.statusCode}`, response.body);
    }
    // In reproduction phase, we assert it IS 200 (proving the bug)
    // After fix, we will change this to 403.
    expect(response.statusCode).toBe(403);
  });
});
