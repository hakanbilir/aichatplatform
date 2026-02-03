// apps/web/src/api/conversationSettings.ts

import { apiRequest } from './client';

export interface ConversationToolsEnabled {
  codeExecution?: boolean;
  webSearch?: boolean;
  structuredTools?: boolean;
}

export interface ConversationRagSettings {
  enabled: boolean;
  spaceId: string | null;
  maxChunks: number;
}

export interface ConversationKbConfig {
  rag?: ConversationRagSettings;
}

export interface ConversationSettings {
  id: string;
  model: string;
  temperature: number;
  systemPrompt: string | null;
  toolsEnabled: ConversationToolsEnabled;
  kbConfig?: ConversationKbConfig | null; // JSON field for knowledge base config (RAG settings)
}

export interface UpdateConversationSettingsPayload {
  model?: string;
  temperature?: number;
  systemPrompt?: string | null;
  toolsEnabled?: ConversationToolsEnabled;
  kbConfig?: ConversationKbConfig; // JSON field for knowledge base config (RAG settings)
}

export async function getConversationSettings(
  token: string,
  conversationId: string,
): Promise<ConversationSettings> {
  return apiRequest<ConversationSettings>(
    `/conversations/${conversationId}/settings`,
    { method: 'GET' },
    token,
  );
}

export async function updateConversationSettings(
  token: string,
  conversationId: string,
  payload: UpdateConversationSettingsPayload,
): Promise<ConversationSettings> {
  return apiRequest<ConversationSettings>(
    `/conversations/${conversationId}/settings`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    token,
  );
}
