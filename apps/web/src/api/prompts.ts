// apps/web/src/api/prompts.ts

import { apiRequest } from './client';

export type PromptTemplateKind = 'system' | 'user' | 'macro';

export interface PromptVariable {
  name: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'multiline';
  required: boolean;
  defaultValue?: string | number | boolean;
}

export interface PromptTemplate {
  id: string;
  orgId: string;
  createdById: string;
  isOrgShared: boolean;
  title: string;
  description?: string | null;
  kind: PromptTemplateKind;
  template: string;
  variables: PromptVariable[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchPromptTemplates(
  token: string,
  orgId: string
): Promise<PromptTemplate[]> {
  const res = await apiRequest<{ templates: PromptTemplate[] }>(
    `/orgs/${orgId}/prompts`,
    { method: 'GET' },
    token
  );
  return res.templates;
}

export interface CreatePromptTemplateInput {
  title: string;
  description?: string;
  kind: PromptTemplateKind;
  template: string;
  variables: PromptVariable[];
  isOrgShared?: boolean;
}

export async function createPromptTemplateApi(
  token: string,
  orgId: string,
  input: CreatePromptTemplateInput
): Promise<PromptTemplate> {
  const res = await apiRequest<{ template: PromptTemplate }>(
    `/orgs/${orgId}/prompts`,
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
  data: Partial<CreatePromptTemplateInput>
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/prompts/${templateId}`,
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

export async function deletePromptTemplateApi(
  token: string,
  orgId: string,
  templateId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/prompts/${templateId}`,
    { method: 'DELETE' },
    token
  );
}

// 42.md: Prompt Template Versions
export interface PromptTemplateVersionDto {
  id: string;
  version: number;
  systemPrompt: string;
  userPrefix: string | null;
  assistantStyle: string | null;
  variables: Record<string, { description?: string; required?: boolean; defaultValue?: string }>;
  createdAt: string;
  createdByDisplayName: string | null;
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
    variables?: Record<string, { description?: string; required?: boolean; defaultValue?: string }>;
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

