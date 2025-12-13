// apps/web/src/api/sso.ts

import { apiRequest } from './client';

export interface SsoConnectionDto {
  id: string;
  orgId: string;
  type: 'saml' | 'oidc';
  name: string;
  isEnabled: boolean;
  enableJitProvisioning: boolean;
  config: Record<string, any>;
}

export async function fetchSsoConnections(
  token: string,
  orgId: string
): Promise<{ connections: SsoConnectionDto[] }> {
  return apiRequest<{ connections: SsoConnectionDto[] }>(
    `/orgs/${orgId}/sso-connections`,
    { method: 'GET' },
    token
  );
}

export async function createSsoConnection(
  token: string,
  orgId: string,
  input: {
    type: 'saml' | 'oidc';
    name: string;
    isEnabled?: boolean;
    enableJitProvisioning?: boolean;
    config: Record<string, any>;
  }
): Promise<{ connection: SsoConnectionDto }> {
  return apiRequest<{ connection: SsoConnectionDto }>(
    `/orgs/${orgId}/sso-connections`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}
