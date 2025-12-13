// apps/web/src/api/playground.ts

import { apiRequest } from './client';

export interface PlaygroundCompletionResponse {
  sessionId: string;
  output: string;
  latencyMs?: number;
}

export async function playgroundComplete(
  token: string,
  orgId: string,
  body: {
    chatProfileId?: string;
    modelProvider?: string;
    modelName?: string;
    prompt: string;
    systemPrompt?: string;
    temperature?: number;
    topP?: number;
    maxTokens?: number | null;
  }
): Promise<PlaygroundCompletionResponse> {
  return apiRequest<PlaygroundCompletionResponse>(
    `/orgs/${orgId}/playground/complete`,
    {
      method: 'POST',
      body: JSON.stringify(body)
    },
    token
  );
}
