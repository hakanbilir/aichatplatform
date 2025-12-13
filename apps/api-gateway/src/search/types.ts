// apps/api-gateway/src/search/types.ts

export type SearchSort = 'recent' | 'relevance';

export interface ConversationSearchFilters {
  modelIds?: string[];
  createdByUserIds?: string[];
  // ISO strings
  createdAfter?: string;
  createdBefore?: string;
  hasTools?: boolean;
  hasRag?: boolean;
  hasFiles?: boolean;
}

export interface ConversationSearchRequest {
  orgId: string;
  query: string;
  page: number;
  pageSize: number;
  sort: SearchSort;
  filters?: ConversationSearchFilters;
}

export interface ConversationSearchHitMessageSnippet {
  messageId: string;
  role: string;
  createdAt: string;
  // short excerpt with ellipsis
  snippet: string;
}

export interface ConversationSearchHit {
  conversationId: string;
  conversationTitle: string;
  modelId: string;
  createdAt: string;
  updatedAt: string;

  // for UI badges
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

