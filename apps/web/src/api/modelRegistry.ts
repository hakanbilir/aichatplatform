// apps/web/src/api/modelRegistry.ts

import { apiRequest } from './client';

export interface ModelRegistryEntryDto {
  id: string;
  orgId: string | null;
  provider: string;
  modelName: string;
  displayName: string;
  description: string | null;
  isEnabled: boolean;
  isDefault: boolean;
  capabilities: string[];
  contextWindow: number | null;
  maxOutputTokens: number | null;
  inputPriceMicros: number | null;
  outputPriceMicros: number | null;
  metadata: Record<string, any> | null;
  scope: 'global' | 'org';
}

export async function fetchOrgModels(
  token: string,
  orgId: string
): Promise<{ models: ModelRegistryEntryDto[] }> {
  return apiRequest<{ models: ModelRegistryEntryDto[] }>(
    `/orgs/${orgId}/models`,
    { method: 'GET' },
    token
  );
}

export async function upsertOrgModel(
  token: string,
  orgId: string,
  model: {
    provider: string;
    modelName: string;
    displayName: string;
    description?: string;
    isEnabled?: boolean;
    isDefault?: boolean;
    capabilities?: string[];
    contextWindow?: number;
    maxOutputTokens?: number;
    inputPriceMicros?: number;
    outputPriceMicros?: number;
    metadata?: Record<string, any>;
  }
): Promise<{ model: ModelRegistryEntryDto }> {
  return apiRequest<{ model: ModelRegistryEntryDto }>(
    `/orgs/${orgId}/models`,
    {
      method: 'PUT',
      body: JSON.stringify(model)
    },
    token
  );
}
