// apps/web/src/api/chatProfiles.ts

import { apiRequest } from './client';

export interface ChatProfileDto {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  isShared: boolean;
  isDefault: boolean;
  modelProvider: string;
  modelName: string;
  temperature: number;
  topP: number;
  maxTokens: number | null;
  systemTemplateId: string | null;
  systemTemplateVersion: number | null;
  enableTools: boolean;
  enableRag: boolean;
  safetyLevel: string;
  createdAt: string;
}

export async function fetchChatProfiles(
  token: string,
  orgId: string,
  onlyShared = false
): Promise<{ profiles: ChatProfileDto[] }> {
  const search = new URLSearchParams();
  if (onlyShared) search.set('onlyShared', 'true');

  return apiRequest<{ profiles: ChatProfileDto[] }>(
    `/orgs/${orgId}/chat-profiles${search.toString() ? `?${search.toString()}` : ''}`,
    { method: 'GET' },
    token
  );
}

export async function createChatProfile(
  token: string,
  orgId: string,
  input: Partial<ChatProfileDto> & {
    name: string;
    modelProvider: string;
    modelName: string;
  }
): Promise<{ profile: ChatProfileDto }> {
  return apiRequest<{ profile: ChatProfileDto }>(
    `/orgs/${orgId}/chat-profiles`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function updateChatProfile(
  token: string,
  orgId: string,
  profileId: string,
  input: Partial<ChatProfileDto>
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/chat-profiles/${profileId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input)
    },
    token
  );
}

export async function deleteChatProfile(
  token: string,
  orgId: string,
  profileId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/chat-profiles/${profileId}`,
    { method: 'DELETE' },
    token
  );
}
