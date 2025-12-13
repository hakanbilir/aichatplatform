// apps/web/src/api/sharing.ts

import { apiRequest } from './client';

export interface ShareLink {
  id: string;
  slug: string;
  isActive: boolean;
  expiresAt?: string | null;
  anonymize: boolean;
  config: Record<string, any>;
}

export interface CreateShareLinkInput {
  expiresAt?: string;
  passphrase?: string;
  anonymize?: boolean;
  hiddenMessageIds?: string[];
}

export interface UpdateShareLinkInput {
  isActive?: boolean;
  expiresAt?: string;
  anonymize?: boolean;
  hiddenMessageIds?: string[];
}

export async function createShareLink(
  token: string,
  orgId: string,
  conversationId: string,
  input: CreateShareLinkInput
): Promise<ShareLink> {
  return apiRequest<ShareLink>(
    `/orgs/${orgId}/conversations/${conversationId}/share`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateShareLink(
  token: string,
  orgId: string,
  shareId: string,
  input: UpdateShareLinkInput
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/share-links/${shareId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
}

export async function deleteShareLink(
  token: string,
  orgId: string,
  shareId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/share-links/${shareId}`,
    { method: 'DELETE' },
    token
  );
}

export interface PublicSharedConversation {
  slug: string;
  title: string;
  createdAt: string;
  createdBy: { id: string; displayName: string } | null;
  messages: { id: string; createdAt: string; role: string; content: string }[];
}

export async function fetchPublicSharedConversation(
  slug: string,
  passphrase?: string
): Promise<PublicSharedConversation> {
  return apiRequest<PublicSharedConversation>(
    `/public/conversations/${slug}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ passphrase })
    },
    undefined // no auth token for public route
  );
}

