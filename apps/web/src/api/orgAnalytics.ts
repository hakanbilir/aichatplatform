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

export interface OrgAnalyticsDailyUsageItem {
  date: string;
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
  byDay: OrgAnalyticsDailyUsageItem[];
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

export async function streamOrgAnalytics(
  token: string,
  orgId: string,
  windowDays: number,
  onData: (data: any) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal
): Promise<void> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000');
  const params = new URLSearchParams();
  if (windowDays) params.set('windowDays', String(windowDays));

  const url = `${API_BASE_URL}/orgs/${orgId}/analytics/kinetic-stream?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === 'processing') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              onError(new Error(parsed.error));
            } else {
              onData(parsed);
            }
          } catch (e) {
            console.warn('Failed to parse analytics stream chunk', e);
          }
        } else if (line.startsWith('event: error')) {
           // Handle named error events if any
        }
      }
    }
  } catch (err) {
    if ((err as Error).name !== 'AbortError') {
      onError(err as Error);
    }
  }
}





