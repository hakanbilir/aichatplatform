// apps/web/src/api/scim.ts

import { apiRequest } from './client';

export interface ScimConnectionDto {
  id: string;
  orgId: string;
  name: string;
  bearerToken?: string; // Only shown on creation/rotation
  isEnabled: boolean;
}

export async function fetchScimConnection(
  token: string,
  orgId: string
): Promise<{ connection: ScimConnectionDto | null }> {
  return apiRequest<{ connection: ScimConnectionDto | null }>(
    `/orgs/${orgId}/scim-connection`,
    { method: 'GET' },
    token
  );
}

export async function createScimConnection(
  token: string,
  orgId: string,
  input: { name: string; isEnabled?: boolean }
): Promise<{ connection: ScimConnectionDto }> {
  return apiRequest<{ connection: ScimConnectionDto }>(
    `/orgs/${orgId}/scim-connection`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function rotateScimToken(
  token: string,
  orgId: string
): Promise<{ bearerToken: string }> {
  return apiRequest<{ bearerToken: string }>(
    `/orgs/${orgId}/scim-connection/rotate-token`,
    {
      method: 'POST'
    },
    token
  );
}
