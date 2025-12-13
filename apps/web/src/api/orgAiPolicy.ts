// apps/web/src/api/orgAiPolicy.ts

import { apiRequest } from './client';

export type OrgAiPolicyTone = 'formal' | 'casual' | 'neutral';

export interface OrgAiPolicyConfig {
  tone?: OrgAiPolicyTone;
  disallowTopics?: string[];
  extra?: Record<string, any>;
}

export interface OrgAiPolicy {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  config: OrgAiPolicyConfig;
}

export async function fetchOrgAiPolicy(
  token: string,
  orgId: string
): Promise<OrgAiPolicy | null> {
  const res = await apiRequest<{ policy: OrgAiPolicy | null }>(
    `/orgs/${orgId}/ai-policy`,
    { method: 'GET' },
    token
  );
  return res.policy;
}

export async function saveOrgAiPolicy(
  token: string,
  orgId: string,
  payload: {
    name: string;
    description?: string;
    systemPrompt: string;
    config?: OrgAiPolicyConfig;
  }
): Promise<OrgAiPolicy> {
  const res = await apiRequest<{ policy: OrgAiPolicy }>(
    `/orgs/${orgId}/ai-policy`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    token
  );
  return res.policy;
}

