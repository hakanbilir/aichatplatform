
import { describe, it, expect, mock } from 'bun:test';

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
          });
        }),
        update: mock(() => Promise.resolve({ id: 'conv_1' })),
      },
      message: {
        findFirst: mock((args) => {
           // Return a message authored by someone else
           return Promise.resolve({
             id: 'msg_1',
             conversationId: 'conv_1',
             authorId: 'user_other', // Message Author is NOT the attacker
             role: 'USER'
           });
        }),
        delete: mock(() => Promise.resolve({ id: 'msg_1' })),
      }
    }
  };
});

// Mock guards
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('MEMBER')), // Requester is MEMBER
    getUserOrgRole: mock(() => Promise.resolve('MEMBER')),
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

describe('Conversation Message Deletion Security', () => {
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
        }
    });

    await app.register(conversationsRoutes);
    return app;
  };

  it('SECURE: MEMBER CANNOT delete message of another user in Org Conversation', async () => {
    const app = await setupApp();

    const response = await app.inject({
      method: 'DELETE',
      url: '/conversations/conv_1/messages/msg_1'
    });

    // Currently this will be 200/204, but we want 403
    expect(response.statusCode).toBe(403);
  });
});
