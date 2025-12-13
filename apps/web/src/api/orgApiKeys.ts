// apps/web/src/api/orgApiKeys.ts

import { apiRequest } from './client';

export interface OrgApiKeySummary {
  id: string;
  name: string;
  description?: string | null;
  scopes: string[];
  isActive: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export async function fetchOrgApiKeys(
  token: string,
  orgId: string
): Promise<{ keys: OrgApiKeySummary[] }> {
  return apiRequest<{ keys: OrgApiKeySummary[] }>(
    `/orgs/${orgId}/admin/api-keys`,
    { method: 'GET' },
    token
  );
}

export async function createOrgApiKey(
  token: string,
  orgId: string,
  input: { name: string; description?: string; scopes: string[]; expiresAt?: string }
): Promise<{ id: string; token: string }> {
  return apiRequest<{ id: string; token: string }>(
    `/orgs/${orgId}/admin/api-keys`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateOrgApiKey(
  token: string,
  orgId: string,
  keyId: string,
  data: Partial<{
    name: string;
    description: string;
    scopes: string[];
    expiresAt: string;
    isActive: boolean;
  }>
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/admin/api-keys/${keyId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    token
  );
}

export async function deleteOrgApiKey(
  token: string,
  orgId: string,
  keyId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/admin/api-keys/${keyId}`,
    { method: 'DELETE' },
    token
  );
}

