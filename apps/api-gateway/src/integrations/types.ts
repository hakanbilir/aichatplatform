// apps/api-gateway/src/integrations/types.ts

export type IntegrationProviderKey = 'generic-webhook' | 'slack' | 'teams' | 'internal-http';

export interface IntegrationProviderDefinition {
  key: IntegrationProviderKey;
  name: string;
  description: string;
  // URL to docs or configuration instructions
  docsUrl?: string;
  // Whether this provider supports outbound webhooks
  supportsWebhooks: boolean;
  // Whether this provider supports external tools (HTTP-backed tools)
  supportsExternalTools: boolean;
}

