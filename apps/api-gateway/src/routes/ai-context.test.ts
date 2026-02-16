// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import fastify from 'fastify';
import { prisma } from '@ai-chat/db';

// Mock the entire db module
mock.module('@ai-chat/db', () => ({
  prisma: {
    user: {
      findUnique: mock(),
    },
    conversation: {
      findMany: mock(),
    },
  },
}));

// Import the route handler (we'll register it to a test app)
import aiContextRoutes from './ai-context';

describe('AI Context Routes', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify();

    // Mock authentication decorator
    app.decorate('authenticate', async (req: any, _reply: any) => {
      // Simulate authenticated user
      req.user = { userId: 'user-123', isSuperadmin: false };
    });

    await app.register(aiContextRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /ai-context returns correct structure', async () => {
    // Setup mocks
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    (prisma.conversation.findMany as any).mockResolvedValue([
      {
        id: 'conv-1',
        title: 'Project Alpha Discussion',
        model: 'gpt-4',
        updatedAt: new Date().toISOString(),
        orgId: 'org-1',
      },
    ]);

    const response = await app.inject({
      method: 'GET',
      url: '/ai-context',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // Verify User
    expect(body.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    // Verify State
    expect(body.state).toBeDefined();
    expect(body.state.theme).toBe('kinetic-glass');
    expect(body.state.active_features).toContain('bento-grid');

    // Verify History
    expect(body.navigation_history).toHaveLength(1);
    expect(body.navigation_history[0].title).toBe('Project Alpha Discussion');

    // Verify Intent
    expect(body.primary_intent).toContain('Resuming active conversation');
  });

  it('GET /ai-context handles empty history correctly', async () => {
    // Setup mocks
    (prisma.user.findUnique as any).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
    });

    (prisma.conversation.findMany as any).mockResolvedValue([]);

    const response = await app.inject({
      method: 'GET',
      url: '/ai-context',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    expect(body.navigation_history).toHaveLength(0);
    expect(body.primary_intent).toBe('Starting a new task');
  });
});
