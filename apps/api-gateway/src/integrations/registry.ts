// apps/api-gateway/src/integrations/registry.ts

import { IntegrationProviderDefinition, IntegrationProviderKey } from './types';

const PROVIDERS: IntegrationProviderDefinition[] = [
  {
    key: 'generic-webhook',
    name: 'Generic Webhook',
    description: 'Send events to any HTTPS endpoint and optionally expose HTTP-backed tools.',
    supportsWebhooks: true,
    supportsExternalTools: true,
  },
  {
    key: 'slack',
    name: 'Slack',
    description: 'Post messages to Slack channels and receive notifications via Slack webhooks.',
    supportsWebhooks: true,
    supportsExternalTools: true,
  },
  {
    key: 'teams',
    name: 'Microsoft Teams',
    description: 'Send notifications and messages to Teams channels.',
    supportsWebhooks: true,
    supportsExternalTools: false,
  },
  {
    key: 'internal-http',
    name: 'Internal HTTP Service',
    description: 'Call internal HTTP endpoints (inside your VPC or cluster) as tools.',
    supportsWebhooks: false,
    supportsExternalTools: true,
  },
];

export function listIntegrationProviders(): IntegrationProviderDefinition[] {
  return PROVIDERS.slice();
}

export function getIntegrationProvider(key: IntegrationProviderKey): IntegrationProviderDefinition | undefined {
  return PROVIDERS.find((p) => p.key === key);
}

