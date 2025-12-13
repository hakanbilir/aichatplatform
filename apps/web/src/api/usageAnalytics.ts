// apps/web/src/api/usageAnalytics.ts

import { apiRequest } from './client';

export interface OrgDailyUsageDto {
  id: string;
  orgId: string;
  date: string;
  provider: string;
  modelName: string;
  feature: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
}

export interface UsageAnalyticsResponse {
  usage: OrgDailyUsageDto[];
  totals: {
    requestCount: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostMicros: number;
  };
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface TopUserDto {
  userId: string;
  user: { id: string; name: string | null; email: string } | null;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostMicros: number;
}

export async function fetchUsageAnalytics(
  token: string,
  orgId: string,
  params: { startDate?: string; endDate?: string; feature?: string } = {}
): Promise<UsageAnalyticsResponse> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.feature) searchParams.set('feature', params.feature);

  const query = searchParams.toString();

  return apiRequest<UsageAnalyticsResponse>(
    `/orgs/${orgId}/analytics/usage${query ? `?${query}` : ''}`,
    { method: 'GET' },
    token
  );
}

export async function fetchTopUsers(
  token: string,
  orgId: string,
  params: { startDate?: string; endDate?: string; feature?: string } = {}
): Promise<{ topUsers: TopUserDto[] }> {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.feature) searchParams.set('feature', params.feature);

  const query = searchParams.toString();

  return apiRequest<{ topUsers: TopUserDto[] }>(
    `/orgs/${orgId}/analytics/top-users${query ? `?${query}` : ''}`,
    { method: 'GET' },
    token
  );
}
