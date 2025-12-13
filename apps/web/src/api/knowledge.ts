// apps/web/src/api/knowledge.ts

import { apiRequest } from './client';

export interface KnowledgeSpace {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  createdAt: string;
}

export interface KnowledgeDocumentSummary {
  id: string;
  spaceId: string;
  orgId: string;
  title: string;
  sourceType: string;
  sourceUrl?: string | null;
  status: string;
  statusMessage?: string | null;
  createdAt: string;
}

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  text: string;
  score: number;
}

export async function fetchKnowledgeSpaces(token: string, orgId: string): Promise<KnowledgeSpace[]> {
  const res = await apiRequest<{ spaces: KnowledgeSpace[] }>(
    `/orgs/${orgId}/knowledge/spaces`,
    { method: 'GET' },
    token
  );
  return res.spaces;
}

export async function createKnowledgeSpace(
  token: string,
  orgId: string,
  name: string
): Promise<{ id: string }> {
  return apiRequest<{ id: string }>(
    `/orgs/${orgId}/knowledge/spaces`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    },
    token
  );
}

export async function ingestTextDocument(
  token: string,
  orgId: string,
  spaceId: string,
  title: string,
  text: string
): Promise<{ documentId: string }> {
  return apiRequest<{ documentId: string }>(
    `/orgs/${orgId}/knowledge/documents:text`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spaceId, title, text })
    },
    token
  );
}

export async function retrieveKnowledgeChunks(
  token: string,
  orgId: string,
  params: { spaceId?: string; query: string; limit?: number }
): Promise<RetrievedChunk[]> {
  const qs = new URLSearchParams();
  qs.set('query', params.query);
  if (params.spaceId) qs.set('spaceId', params.spaceId);
  if (params.limit && params.limit > 0) qs.set('limit', String(params.limit));

  const res = await apiRequest<{ chunks: RetrievedChunk[] }>(
    `/orgs/${orgId}/knowledge/retrieve?${qs.toString()}`,
    { method: 'GET' },
    token
  );

  return res.chunks;
}

