import { describe, it, expect, mock } from 'bun:test';
import fastify from 'fastify';

// Mock the db module before importing routes
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      user: {
        findUnique: () =>
          Promise.resolve({
            id: 'user_1',
            email: 'test@example.com',
            name: 'Test User',
          }),
      },
      conversation: {
        findMany: () =>
          Promise.resolve([
            {
              id: 'conv_1',
              title: 'Project X Analysis',
              model: 'gpt-4',
              updatedAt: new Date(),
              orgId: 'org_1',
            },
          ]),
      },
    },
  };
});

// Import after mocking
import aiContextRoutes from '../src/routes/ai-context';

describe('AI Context Middleware', () => {
  const setupApp = async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req: any, reply: any) => {
      req.user = { userId: 'user_1', isSuperadmin: false };
    });

    await app.register(aiContextRoutes);
    return app;
  };

  it('GET /ai-context should return user context and intent', async () => {
    const app = await setupApp();

    const response = await app.inject({
      method: 'GET',
      url: '/ai-context',
    });

    expect(response.statusCode).toBe(200);
    const json = JSON.parse(response.body);

    expect(json.user.id).toBe('user_1');
    expect(json.state.theme).toBe('kinetic-glass');
    expect(json.primary_intent).toContain('Resuming active conversation');
    expect(json.navigation_history).toHaveLength(1);
    expect(json.navigation_history[0].title).toBe('Project X Analysis');
  });
});
