// apps/web/src/api/orgSafety.ts

import { apiRequest } from './client';

export interface OrgSafetyConfigDto {
  id: string;
  orgId: string;
  moderateUserMessages: boolean;
  moderateAssistantMessages: boolean;
  categoryActions: Record<string, 'block' | 'warn' | 'log_only' | 'allow'>;
  allowedDomains: string[];
}

export async function fetchOrgSafetyConfig(
  token: string,
  orgId: string
): Promise<{ config: OrgSafetyConfigDto | null }> {
  return apiRequest<{ config: OrgSafetyConfigDto | null }>(
    `/orgs/${orgId}/safety`,
    { method: 'GET' },
    token
  );
}

export async function updateOrgSafetyConfig(
  token: string,
  orgId: string,
  data: Partial<{
    moderateUserMessages: boolean;
    moderateAssistantMessages: boolean;
    categoryActions: Record<string, 'block' | 'warn' | 'log_only' | 'allow'>;
    allowedDomains: string[];
  }>
): Promise<{ config: OrgSafetyConfigDto }> {
  return apiRequest<{ config: OrgSafetyConfigDto }>(
    `/orgs/${orgId}/safety`,
    {
      method: 'PUT',
      body: JSON.stringify(data)
    },
    token
  );
}
