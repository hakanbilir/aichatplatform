// apps/web/src/api/search.ts

import { apiRequest } from './client';

export type SearchSort = 'recent' | 'relevance';

export interface ConversationSearchFilters {
  modelIds?: string[];
  createdByUserIds?: string[];
  createdAfter?: string;
  createdBefore?: string;
  hasTools?: boolean;
  hasRag?: boolean;
  hasFiles?: boolean;
}

export interface ConversationSearchHitMessageSnippet {
  messageId: string;
  role: string;
  createdAt: string;
  snippet: string;
}

export interface ConversationSearchHit {
  conversationId: string;
  conversationTitle: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;
  hasTools: boolean;
  hasRag: boolean;
  hasFiles: boolean;
  messages: ConversationSearchHitMessageSnippet[];
}

export interface ConversationSearchResponse {
  total: number;
  page: number;
  pageSize: number;
  hits: ConversationSearchHit[];
}

export interface ConversationSearchPayload {
  query: string;
  page?: number;
  pageSize?: number;
  sort?: SearchSort;
  filters?: ConversationSearchFilters;
}

export async function searchConversationsApi(
  token: string,
  orgId: string,
  payload: ConversationSearchPayload
): Promise<ConversationSearchResponse> {
  return apiRequest<ConversationSearchResponse>(
    `/orgs/${orgId}/search`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    token
  );
}

