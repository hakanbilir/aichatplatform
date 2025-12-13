// apps/web/src/api/moderationIncidents.ts

import { apiRequest } from './client';

export interface ModerationIncidentDto {
  id: string;
  createdAt: string;
  orgId: string;
  conversationId?: string | null;
  messageId?: string | null;
  userId?: string | null;
  source: 'user' | 'assistant' | 'tool';
  categories: { category: string; score: number }[];
  action: 'block' | 'warn' | 'log_only' | 'allow';
  reason?: string | null;
  contentSnippet: string;
  isSevere: boolean;
}

export interface ModerationIncidentsResponse {
  items: ModerationIncidentDto[];
  page: number;
  pageSize: number;
  total: number;
}

export async function fetchModerationIncidents(
  token: string,
  orgId: string,
  params: { page?: number; pageSize?: number; source?: string; severeOnly?: boolean } = {}
): Promise<ModerationIncidentsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
  if (params.source) searchParams.set('source', params.source);
  if (params.severeOnly) searchParams.set('severeOnly', 'true');

  const query = searchParams.toString();

  return apiRequest<ModerationIncidentsResponse>(
    `/orgs/${orgId}/safety/incidents${query ? `?${query}` : ''}`,
    { method: 'GET' },
    token
  );
}
