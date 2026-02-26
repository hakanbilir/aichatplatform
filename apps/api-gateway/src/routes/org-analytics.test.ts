// eslint-disable-next-line import/no-unresolved
import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test';
import fastify from 'fastify';

// Mock dependencies BEFORE importing anything that uses them
const mockFindUniqueOrg = mock();
const mockFindManyMessage = mock();
const mockOrgMemberFindFirst = mock();
const mockQueryRaw = mock();

mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      organization: {
        findUnique: mockFindUniqueOrg,
      },
      message: {
        findMany: mockFindManyMessage,
      },
      orgMember: {
        findFirst: mockOrgMemberFindFirst,
      },
      $queryRaw: mockQueryRaw,
    },
  };
});

// Mock assertOrgPermission
mock.module('../rbac/guards', () => ({
  assertOrgPermission: mock(async () => true),
}));

describe('Org Analytics Routes', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify();

    // Mock authentication decorator
    app.decorate('authenticate', async (req: any, _reply: any) => {
      req.user = { userId: 'user-123', isSuperadmin: false };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
      getter: () => ({
        t: (key: string) => key,
      }),
    });

    const { default: orgAnalyticsRoutes } = await import('./org-analytics');
    await app.register(orgAnalyticsRoutes);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /orgs/:id/usage returns aggregated data via worker', async () => {
    // Setup mocks
    const orgId = 'org-123';

    mockFindUniqueOrg.mockResolvedValue({
      id: orgId,
      plan: 'pro',
      monthlySoftLimitTokens: 100000,
      monthlyHardLimitTokens: 200000,
    });

    // Mock messages
    const mockMessages = [
      {
        createdAt: new Date('2026-01-01T10:00:00Z'),
        meta: {
          usage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
            latencyMs: 100,
          },
        },
        conversation: {
          model: 'gpt-4',
        },
      },
      {
        createdAt: new Date('2026-01-01T11:00:00Z'),
        meta: {
          usage: {
            promptTokens: 5,
            completionTokens: 5,
            totalTokens: 10,
            latencyMs: 50,
          },
        },
        conversation: {
          model: 'gpt-3.5',
        },
      },
    ];

    mockFindManyMessage.mockResolvedValue(mockMessages);

    const response = await app.inject({
      method: 'GET',
      url: `/orgs/${orgId}/usage?days=30`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // Verify Totals
    expect(body.totals.promptTokens).toBe(15);
    expect(body.totals.completionTokens).toBe(25);
    expect(body.totals.totalTokens).toBe(40);
    expect(body.completions).toBe(2);

    // Verify By Model
    expect(body.byModel).toHaveLength(2);
    // Note: sorting order might affect finding, but we expect both
    const gpt4 = body.byModel.find((m: any) => m.model === 'gpt-4');
    expect(gpt4).toBeDefined();
    expect(gpt4.totalTokens).toBe(30);
    expect(gpt4.avgLatencyMs).toBe(100);

    // Verify By Day
    expect(body.byDay).toHaveLength(1);
    expect(body.byDay[0].date).toBe('2026-01-01');
    expect(body.byDay[0].totalTokens).toBe(40);
  });
});
