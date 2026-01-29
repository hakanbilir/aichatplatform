// apps/web/src/api/prompts.ts

import { apiRequest } from './client';

export interface PromptVariable {
  description?: string;
  required?: boolean;
  defaultValue?: string;
}

export interface PromptTemplateVersionDto {
  id: string;
  version: number;
  systemPrompt: string;
  userPrefix: string | null;
  assistantStyle: string | null;
  variables: Record<string, PromptVariable>;
  createdAt: string;
  createdByDisplayName: string | null;
}

export interface PromptTemplate {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  latestVersion: PromptTemplateVersionDto | null;
}

export interface PromptTemplateDetailDto {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  versions: PromptTemplateVersionDto[];
}

export async function fetchPromptTemplates(
  token: string,
  orgId: string
): Promise<PromptTemplate[]> {
  const res = await apiRequest<{ templates: PromptTemplate[] }>(
    `/orgs/${orgId}/prompt-templates`,
    { method: 'GET' },
    token
  );
  return res.templates;
}

export interface CreatePromptTemplateInput {
  name: string;
  description?: string;
  systemPrompt: string;
  userPrefix?: string;
  assistantStyle?: string;
  variables?: Record<string, PromptVariable>;
  metadata?: Record<string, any>;
}

export async function createPromptTemplateApi(
  token: string,
  orgId: string,
  input: CreatePromptTemplateInput
): Promise<PromptTemplate> {
  const res = await apiRequest<{ template: PromptTemplate }>(
    `/orgs/${orgId}/prompt-templates`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
  return res.template;
}

export async function updatePromptTemplateApi(
  token: string,
  orgId: string,
  templateId: string,
  data: { description?: string; isArchived?: boolean }
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/prompt-templates/${templateId}`,
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

// NOTE: No DELETE endpoint in backend yet.
export async function deletePromptTemplateApi(
  token: string,
  orgId: string,
  templateId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/prompt-templates/${templateId}`,
    { method: 'DELETE' },
    token
  );
}

export async function fetchPromptTemplateDetail(
  token: string,
  orgId: string,
  templateId: string
): Promise<{ template: PromptTemplateDetailDto }> {
  return apiRequest<{ template: PromptTemplateDetailDto }>(
    `/orgs/${orgId}/prompt-templates/${templateId}`,
    { method: 'GET' },
    token
  );
}

export async function createPromptTemplateVersion(
  token: string,
  orgId: string,
  templateId: string,
  input: {
    systemPrompt: string;
    userPrefix?: string;
    assistantStyle?: string;
    variables?: Record<string, PromptVariable>;
    metadata?: Record<string, any>;
  }
): Promise<{ version: PromptTemplateVersionDto }> {
  return apiRequest<{ version: PromptTemplateVersionDto }>(
    `/orgs/${orgId}/prompt-templates/${templateId}/versions`,
    {
      method: 'POST',
      body: JSON.stringify(input)
    },
    token
  );
}
