// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import fastify from 'fastify';

// Mock dependencies
mock.module('../search/service', () => ({
  searchConversations: mock(() =>
    Promise.resolve({
      total: 2,
      page: 0,
      pageSize: 20,
      hits: [
        { conversationId: '1', conversationTitle: 'Hit 1' },
        { conversationId: '2', conversationTitle: 'Hit 2' },
      ],
    }),
  ),
}));

mock.module('../rbac/guards', () => ({
  assertOrgPermission: mock(() => Promise.resolve()),
  getUserOrgRole: mock(() => Promise.resolve('ADMIN')),
  userHasOrgPermission: mock(() => Promise.resolve(true)),
}));

import searchRoutes from './search';

describe('Search Routes Streaming', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req: any, _reply: any) => {
      req.user = { userId: 'user-123', isSuperadmin: false };
      // mock i18n
      req.i18n = { t: (key: string) => key };
    });

    await app.register(searchRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /orgs/:orgId/search with stream=true returns SSE events', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org-1/search',
      payload: {
        query: 'test',
        stream: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('text/event-stream');

    const body = response.body;
    expect(body).toContain('event: meta');
    expect(body).toContain('event: hit');
    expect(body).toContain('event: done');
    expect(body).toContain('Hit 1');
    expect(body).toContain('Hit 2');
  });

  it('POST /orgs/:orgId/search without stream returns JSON', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org-1/search',
      payload: {
        query: 'test',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('application/json');
    const json = JSON.parse(response.body);
    expect(json.total).toBe(2);
    expect(json.hits).toHaveLength(2);
  });
});
