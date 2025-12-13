// apps/api-gateway/src/promptStudio/chatProfileTypes.ts

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
