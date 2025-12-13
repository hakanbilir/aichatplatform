import { apiRequest } from './client';

export interface ConversationListItem {
  id: string;
  title: string | null;
  model: string | null;
  pinned?: boolean;
  archivedAt?: string | null;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  orgId: string | null;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  nextCursor: string | null;
}

export interface CreateConversationPayload {
  title?: string;
  model?: string;
}

export interface ConversationDetails {
  id: string;
  title: string | null;
  model: string | null;
  systemPrompt: string | null;
  temperature: number | null;
  topP: number | null;
  pinned?: boolean;
  archivedAt?: string | null;
  lastActivityAt?: string;
  createdAt: string;
  updatedAt: string;
  orgId: string | null;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
}

export async function listConversations(token: string): Promise<{ conversations: ConversationListItem[] }> {
  return apiRequest<{ conversations: ConversationListItem[] }>('/conversations', { method: 'GET' }, token);
}

export async function createConversation(
  token: string,
  data: { title?: string; systemPrompt?: string; model?: string; temperature?: number; topP?: number },
): Promise<ConversationListItem> {
  const result = await apiRequest<ConversationListItem>(
    '/conversations',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
  );
  return result;
}

export async function getConversation(token: string, id: string): Promise<{ conversation: ConversationDetails }> {
  return apiRequest<{ conversation: ConversationDetails }>(`/conversations/${id}`, { method: 'GET' }, token);
}

export interface UpdateConversationPayload {
  title?: string | null;
  systemPrompt?: string | null;
  model?: string | null;
  temperature?: number | null;
  topP?: number | null;
  pinned?: boolean;
  archived?: boolean;
}

export async function updateConversation(
  token: string,
  id: string,
  data: UpdateConversationPayload,
): Promise<{ conversation: ConversationDetails }> {
  return apiRequest<{ conversation: ConversationDetails }>(
    `/conversations/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token,
  );
}

export interface ConversationUsageTotals {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ConversationUsageSummary {
  conversationId: string;
  totals: ConversationUsageTotals;
  completions: number;
  lastMessageAt: string | null;
}

export async function getConversationUsage(token: string, id: string): Promise<ConversationUsageSummary> {
  return apiRequest<ConversationUsageSummary>(`/conversations/${id}/usage`, { method: 'GET' }, token);
}

// Org-scoped conversation endpoints
export async function listOrgConversations(
  token: string,
  orgId: string,
  params: { search?: string; limit?: number; cursor?: string } = {},
): Promise<ConversationListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.limit != null) query.set('limit', String(params.limit));
  if (params.cursor) query.set('cursor', params.cursor);

  const suffix = query.toString() ? `?${query.toString()}` : '';

  return apiRequest<ConversationListResponse>(`/orgs/${orgId}/conversations${suffix}`, { method: 'GET' }, token);
}

export async function createOrgConversation(
  token: string,
  orgId: string,
  payload: CreateConversationPayload = {},
): Promise<ConversationListItem> {
  return apiRequest<ConversationListItem>(
    `/orgs/${orgId}/conversations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    token,
  );
}

