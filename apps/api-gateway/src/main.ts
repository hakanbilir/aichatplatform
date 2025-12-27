import fastify from 'fastify';
import cors from '@fastify/cors';
import { getConfig } from '@ai-chat/config';
import { ensureDbExtensions, checkDbConnection } from '@ai-chat/db';
import { loggerConfig } from './observability/logger';
import authPlugin from './plugins/auth';
import metricsPlugin from './plugins/metrics';
import securityPlugin from './plugins/security';
import i18nMiddleware from './i18n/middleware';
import authRoutes from './routes/auth';
import orgRoutes from './routes/orgs';
import conversationsRoutes from './routes/conversations';
import chatRoutes from './routes/chat';
import orgAnalyticsRoutes from './routes/org-analytics';
import conversationSettingsRoutes from './routes/conversationSettings';
import toolsRoutes from './routes/tools';
import healthRoutes from './routes/health';
import orgIntegrationsRoutes from './routes/orgIntegrations';
import knowledgeRoutes from './routes/knowledge';
import orgAiPolicyRoutes from './routes/orgAiPolicy';
import promptTemplatesRoutes from './routes/promptTemplates';
import conversationPresetsRoutes from './routes/conversationPresets';
import searchRoutes from './routes/search';
import webhooksRoutes from './routes/webhooks';
import auditLogRoutes from './routes/auditLog';
import exportsRoutes from './routes/exports';
import sharingRoutes from './routes/sharing';
import retentionRoutes from './routes/retention';
import orgAdminMembersRoutes from './routes/orgAdminMembers';
import orgApiKeysRoutes from './routes/orgApiKeys';
import orgBrandingRoutes from './routes/orgBranding';
import superadminRoutes from './routes/superadmin';
// Docs 41-50 routes
import orgSafetyRoutes from './routes/orgSafety';
import moderationIncidentsRoutes from './routes/moderationIncidents';
import chatProfilesRoutes from './routes/chatProfiles';
import modelRegistryRoutes from './routes/modelRegistry';
import playgroundRoutes from './routes/playground';
import experimentsRoutes from './routes/experiments';
import experimentRunRoutes from './routes/experimentRun';
import experimentFeedbackRoutes from './routes/experimentFeedback';
import usageAnalyticsRoutes from './routes/usageAnalytics';
import billingRoutes from './routes/billing';
import paytrWebhookRoutes from './routes/paytrWebhook';
import ssoRoutes from './routes/sso';
import orgSsoConnectionsRoutes from './routes/orgSsoConnections';
import scimUsersRoutes from './routes/scimUsers';
import orgScimConnectionsRoutes from './routes/orgScimConnections';
import datasetsRoutes from './routes/datasets';
import trainingRunsRoutes from './routes/training-runs';
import baseModelsRoutes from './routes/base-models';
import { initLlmProviders } from './llm/router';
import { setModerationProvider } from './safety/provider';
import { HeuristicModerationProvider } from './safety/heuristicProvider';
import { resolveTenantByHostname } from './tenancy/hostnameResolver';
import fp from 'fastify-plugin';

// Tenancy plugin for hostname-based tenant resolution (47.md)
// Hostname tabanlı tenant çözümlemesi için tenancy plugin'i (47.md)
const tenancyPlugin = fp(async (app) => {
  app.addHook('onRequest', async (req, _reply) => {
    const hostname = req.hostname;
    if (hostname) {
      const tenant = await resolveTenantByHostname(hostname);
      (req as any).tenant = tenant;
    }
  });
});

// Declare tenant context on FastifyRequest (47.md)
// FastifyRequest üzerinde tenant context'i bildir (47.md)
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: {
      orgId: string | null;
      orgSlug?: string | null;
    };
  }
}

async function buildServer() {
  const config = getConfig();

  // Use logger configuration from observability module
  // Observability modülünden logger yapılandırmasını kullan
  const app = fastify({
    logger: loggerConfig,
  });

  // Initialize moderation provider (41.md)
  // Moderation provider'ı başlat (41.md)
  setModerationProvider(new HeuristicModerationProvider());

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Security plugin (Helmet + Rate Limiting)
  // Güvenlik plugin'i (Helmet + Rate Limiting)
  await app.register(securityPlugin);

  // i18n middleware (must be registered before routes)
  // i18n middleware (route'lardan önce kayıt edilmelidir)
  await app.register(i18nMiddleware);

  // Metrics plugin (adds /metrics and HTTP request metrics)
  // Metrikler plugin'i (/metrics ve HTTP istek metriklerini ekler)
  await app.register(metricsPlugin);

  // Health check routes (no auth)
  // Sağlık kontrolü route'ları (auth yok)
  await app.register(healthRoutes);

  // Legacy health endpoint (keep for backward compatibility)
  app.get('/health', async () => {
    const dbOk = await checkDbConnection();
    return {
      status: 'ok',
      env: config.NODE_ENV,
      db: dbOk ? 'up' : 'down',
      defaultModel: config.DEFAULT_MODEL,
    };
  });

  // Tenancy plugin (hostname-based tenant resolution) (47.md)
  // Tenancy plugin (hostname tabanlı tenant çözümlemesi) (47.md)
  await app.register(tenancyPlugin);

  // Auth plugin (JWT + authenticate hook)
  // Auth plugin (JWT + authenticate hook)
  await app.register(authPlugin);

  // Routes
  // Route'lar
  await app.register(authRoutes);
  await app.register(orgRoutes);
  await app.register(conversationsRoutes);
  await app.register(chatRoutes);
  await app.register(orgAnalyticsRoutes);
  await app.register(conversationSettingsRoutes);
  await app.register(toolsRoutes);
  await app.register(orgIntegrationsRoutes);
  await app.register(knowledgeRoutes);
  await app.register(orgAiPolicyRoutes);
  await app.register(promptTemplatesRoutes);
  await app.register(conversationPresetsRoutes);
  await app.register(searchRoutes);
  await app.register(webhooksRoutes);
  await app.register(auditLogRoutes);
  await app.register(exportsRoutes);
  await app.register(sharingRoutes);
  await app.register(retentionRoutes);
  await app.register(orgAdminMembersRoutes);
  await app.register(orgApiKeysRoutes);
  await app.register(orgBrandingRoutes);
  await app.register(superadminRoutes);

  // Docs 41-50: New feature routes
  await app.register(orgSafetyRoutes);
  await app.register(moderationIncidentsRoutes);
  await app.register(chatProfilesRoutes);
  await app.register(modelRegistryRoutes);
  await app.register(playgroundRoutes);
  await app.register(experimentsRoutes);
  await app.register(experimentRunRoutes);
  await app.register(experimentFeedbackRoutes);
  await app.register(usageAnalyticsRoutes);
  await app.register(billingRoutes);
  await app.register(paytrWebhookRoutes);
  await app.register(ssoRoutes);
  await app.register(orgSsoConnectionsRoutes);
  await app.register(scimUsersRoutes);
  await app.register(orgScimConnectionsRoutes);
  await app.register(datasetsRoutes);
  await app.register(trainingRunsRoutes);
  await app.register(baseModelsRoutes);

  // Initialize LLM providers
  initLlmProviders();

  // Ensure DB extensions
  // DB uzantılarını sağla
  await ensureDbExtensions();

  return app;
}

async function start() {
  const config = getConfig();
  const port = config.API_PORT;
  const host = config.API_HOST;

  const app = await buildServer();

  app
    .listen({ port, host })
    .then(() => {
      app.log.info(`API Gateway listening on http://${host}:${port}`);
    })
    .catch((err) => {
      app.log.error(err, 'Failed to start API Gateway');
      process.exit(1);
    });
}

start();


