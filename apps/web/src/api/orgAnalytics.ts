// apps/web/src/api/orgAnalytics.ts

import { apiRequest } from './client';

// Quota type matching backend OrgQuotaWindowUsage
// Backend OrgQuotaWindowUsage ile eşleşen kota tipi
export type OrgPlan = 'FREE' | 'PRO' | 'ENTERPRISE' | 'CUSTOM';

export interface OrgQuotaWindowUsage {
  orgId: string;
  plan: OrgPlan;
  windowDays: number;
  usageTokens: number;
  monthlySoftLimitTokens: number | null;
  monthlyHardLimitTokens: number | null;
  softLimitRemainingTokens: number | null;
  hardLimitRemainingTokens: number | null;
  softLimitExceeded: boolean;
  hardLimitExceeded: boolean;
}

export interface OrgAnalyticsModelUsageItem {
  model: string;
  chatTurns: number;
}

export interface OrgAnalyticsToolUsageItem {
  tool: string;
  calls: number;
}

export interface OrgAnalyticsUserUsageItem {
  userId: string;
  chatTurns: number;
}

export interface OrgAnalyticsResult {
  org: {
    id: string;
    name: string;
  };
  windowDays: number;
  quota: OrgQuotaWindowUsage;
  totals: {
    chatTurns: number;
    chatTurnsWithTools: number;
    chatTurnsWithoutTools: number;
  };
  byModel: OrgAnalyticsModelUsageItem[];
  byTool: OrgAnalyticsToolUsageItem[];
  byUser: OrgAnalyticsUserUsageItem[];
}

export async function fetchOrgAnalytics(
  token: string,
  orgId: string,
  windowDays?: number
): Promise<OrgAnalyticsResult> {
  const params = new URLSearchParams();
  if (windowDays && windowDays > 0) {
    params.set('windowDays', String(windowDays));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';

  return apiRequest<OrgAnalyticsResult>(
    `/orgs/${orgId}/analytics${suffix}`,
    { method: 'GET' },
    token
  );
}





