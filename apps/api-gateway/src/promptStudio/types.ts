// apps/api-gateway/src/promptStudio/types.ts

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

export interface PromptTemplateDto {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  latestVersion: PromptTemplateVersionDto | null;
}
