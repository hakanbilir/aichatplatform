// apps/web/src/api/retention.ts

import { apiRequest } from './client';

export interface OrgDataRetentionConfig {
  id: string;
  orgId: string;
  maxConversationAgeDays: number | null;
  allowUserDeletion: boolean;
  allowExports: boolean;
  allowShareLinks: boolean;
  hardDeleteAfterDays: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateRetentionConfigInput {
  maxConversationAgeDays?: number | null;
  allowUserDeletion?: boolean;
  allowExports?: boolean;
  allowShareLinks?: boolean;
  hardDeleteAfterDays?: number | null;
}

export async function fetchRetentionConfig(
  token: string,
  orgId: string
): Promise<OrgDataRetentionConfig | null> {
  const res = await apiRequest<{ config: OrgDataRetentionConfig | null }>(
    `/orgs/${orgId}/retention`,
    { method: 'GET' },
    token
  );
  return res.config;
}

export async function updateRetentionConfig(
  token: string,
  orgId: string,
  input: UpdateRetentionConfigInput
): Promise<OrgDataRetentionConfig> {
  const res = await apiRequest<{ config: OrgDataRetentionConfig }>(
    `/orgs/${orgId}/retention`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
  return res.config;
}

