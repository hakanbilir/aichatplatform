// apps/web/src/api/usageAnalytics.ts

import { apiRequest, API_BASE_URL } from './client';

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

export function subscribeToUsageAnalytics(
  token: string,
  orgId: string,
  onData: (data: any) => void
): () => void {
  const url = `${API_BASE_URL}/orgs/${orgId}/analytics/usage/stream`;
  const controller = new AbortController();

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal
  }).then(async (response) => {
    if (!response.body) return;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
           const trimmed = line.trim();
           if (trimmed.startsWith('data: ')) {
             try {
                const json = JSON.parse(trimmed.substring(6));
                onData(json);
             } catch (e) {
                console.error('Failed to parse SSE JSON', e);
             }
           }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Stream error', error);
      }
    }
  }).catch((err) => {
     if (err.name !== 'AbortError') console.error('Stream fetch error', err);
  });

  return () => controller.abort();
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
