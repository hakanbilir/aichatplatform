// apps/web/src/api/search.ts

import { API_BASE_URL, apiRequest } from './client';

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
  payload: ConversationSearchPayload,
): Promise<ConversationSearchResponse> {
  return apiRequest<ConversationSearchResponse>(
    `/orgs/${orgId}/search`,
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

export async function searchConversationsStream(
  token: string,
  orgId: string,
  payload: ConversationSearchPayload,
  onData: (event: string, data: any) => void,
): Promise<void> {
  const url = `${API_BASE_URL}/orgs/${orgId}/search`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ ...payload, stream: true }),
  });

  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (done) break;
      const value = result.value;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        const lines = block.split('\n');
        let event = 'message';
        let data = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              data = JSON.parse(line.substring(6));
            } catch (e) {
              console.error('Failed to parse SSE data', e);
            }
          }
        }

        if (data !== null) {
          onData(event, data);
        }
      }
    }
  } catch (err) {
    console.error('Stream error', err);
    throw err;
  }
}
