
import { describe, it, expect, mock } from 'bun:test';
import fastify from 'fastify';

// Mock the db module
mock.module('@ai-chat/db', () => {
  return {
    prisma: {
      orgIntegration: {
        findMany: mock(() => Promise.resolve([
          {
            id: 'int_1',
            orgId: 'org_1',
            providerId: 'prov_1',
            name: 'Test Integration',
            isEnabled: true,
            credentials: { apiKey: 'sensitive_secret_value' },
            config: {},
            createdAt: new Date(),
            updatedAt: new Date(),
            provider: {
              id: 'prov_1',
              key: 'generic-webhook',
              name: 'Webhook',
              description: 'Generic webhook'
            }
          }
        ])),
        create: mock((args: any) => Promise.resolve({
          id: 'int_2',
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        updateMany: mock(() => Promise.resolve({ count: 1 })),
        deleteMany: mock(() => Promise.resolve({ count: 1 })),
      },
      integrationProvider: {
        upsert: mock(() => Promise.resolve({ id: 'prov_1', key: 'generic-webhook' })),
        findFirst: mock(() => Promise.resolve({ id: 'prov_1', key: 'generic-webhook' }))
      }
    }
  };
});

// Mock guards
mock.module('../src/rbac/guards', () => {
  return {
    assertOrgPermission: mock(() => Promise.resolve('OWNER')),
  };
});

// Mock registry
mock.module('../src/integrations/registry', () => {
  return {
    getIntegrationProvider: mock(() => ({
      key: 'generic-webhook',
      name: 'Webhook',
      description: 'Generic webhook'
    }))
  };
});

import orgIntegrationsRoutes from '../src/routes/orgIntegrations';

describe('Org Integrations Security', () => {
  it('GET /orgs/:orgId/integrations should redact credentials', async () => {
    const app = fastify();

    // Mock authentication
    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    // Mock i18n
    app.decorateRequest('i18n', {
        getter() {
            return { t: (key: string) => key };
        }
    });

    await app.register(orgIntegrationsRoutes);

    const response = await app.inject({
      method: 'GET',
      url: '/orgs/org_1/integrations'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);

    // Check if we got integrations
    expect(body.integrations).toHaveLength(1);

    // CRITICAL SECURITY CHECK: Credentials should be empty object
    expect(body.integrations[0].credentials).toEqual({});
    expect(body.integrations[0].credentials).not.toHaveProperty('apiKey');
  });

  it('POST /orgs/:orgId/integrations should redact credentials in response', async () => {
    const app = fastify();

    app.decorate('authenticate', async (req, reply) => {
      req.user = { userId: 'user1', isSuperadmin: false };
    });

    app.decorateRequest('i18n', {
        getter() {
            return { t: (key: string) => key };
        }
    });

    await app.register(orgIntegrationsRoutes);

    const response = await app.inject({
      method: 'POST',
      url: '/orgs/org_1/integrations',
      payload: {
          providerKey: 'generic-webhook',
          name: 'New Integration',
          credentials: { secretKey: 'very_secret' }
      }
    });

    expect(response.statusCode).toBe(201);
    const body = JSON.parse(response.payload);

    // CRITICAL SECURITY CHECK: Credentials should be empty object
    expect(body.integration.credentials).toEqual({});
    expect(body.integration.credentials).not.toHaveProperty('secretKey');
  });
});
