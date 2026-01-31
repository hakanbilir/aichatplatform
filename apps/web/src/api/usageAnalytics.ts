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

export function streamUsageAnalytics(
  token: string,
  orgId: string,
  params: { startDate?: string; endDate?: string; feature?: string },
  onData: (data: UsageAnalyticsResponse) => void,
  onError: (err: any) => void
): () => void {
  const searchParams = new URLSearchParams();
  if (params.startDate) searchParams.set('startDate', params.startDate);
  if (params.endDate) searchParams.set('endDate', params.endDate);
  if (params.feature) searchParams.set('feature', params.feature);

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/orgs/${orgId}/analytics/usage${query ? `?${query}` : ''}`;

  const controller = new AbortController();

  fetch(url, {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream'
      },
      signal: controller.signal
  }).then(async (response) => {
      if (!response.ok) {
          throw new Error(`SSE Error: ${response.status} ${response.statusText}`);
      }
      if (!response.body) throw new Error('No body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
              const lines = part.split('\n');
              for (const line of lines) {
                  if (line.startsWith('data: ')) {
                      const json = line.slice(6);
                      try {
                          const data = JSON.parse(json);
                          if (data.status === 'processing') continue;
                          if (data.error) {
                              onError(data.error);
                          } else {
                              onData(data);
                          }
                      } catch (e) {
                          console.error('SSE parse error', e);
                      }
                  }
              }
          }
      }
  }).catch((err) => {
      if (err.name !== 'AbortError') {
          onError(err);
      }
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
