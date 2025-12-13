// apps/web/src/api/presets.ts

import { apiRequest } from './client';

export interface ConversationPresetConfig {
  modelId?: string;
  tools?: string[];
  rag?: {
    enabled: boolean;
    spaceId: string | null;
    maxChunks: number;
  };
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ConversationPreset {
  id: string;
  orgId: string;
  createdById: string;
  name: string;
  description?: string | null;
  uiConfig: {
    icon?: string;
    color?: string;
    emoji?: string;
  };
  systemPrompt: string;
  config: ConversationPresetConfig;
  createdAt: string;
  updatedAt: string;
}

export async function fetchConversationPresets(
  token: string,
  orgId: string
): Promise<ConversationPreset[]> {
  const res = await apiRequest<{ presets: ConversationPreset[] }>(
    `/orgs/${orgId}/presets`,
    { method: 'GET' },
    token
  );
  return res.presets;
}

export interface CreateConversationPresetInput {
  name: string;
  description?: string;
  uiConfig?: {
    icon?: string;
    color?: string;
    emoji?: string;
  };
  systemPrompt: string;
  config: ConversationPresetConfig;
}

export async function createConversationPresetApi(
  token: string,
  orgId: string,
  input: CreateConversationPresetInput
): Promise<ConversationPreset> {
  const res = await apiRequest<{ preset: ConversationPreset }>(
    `/orgs/${orgId}/presets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
  return res.preset;
}

export async function updateConversationPresetApi(
  token: string,
  orgId: string,
  presetId: string,
  data: Partial<CreateConversationPresetInput>
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/presets/${presetId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    token
  );
}

export async function deleteConversationPresetApi(
  token: string,
  orgId: string,
  presetId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/presets/${presetId}`,
    { method: 'DELETE' },
    token
  );
}

