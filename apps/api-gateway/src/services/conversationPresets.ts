// apps/api-gateway/src/services/conversationPresets.ts

import { prisma } from '@ai-chat/db';

export interface ConversationPresetInput {
  orgId: string;
  createdById: string;
  name: string;
  description?: string | null;
  uiConfig?: any;
  systemPrompt: string;
  config: any;
}

export async function createConversationPreset(input: ConversationPresetInput) {
  return prisma.conversationPreset.create({
    data: {
      orgId: input.orgId,
      createdById: input.createdById,
      name: input.name,
      description: input.description ?? null,
      uiConfig: input.uiConfig ?? {},
      systemPrompt: input.systemPrompt,
      config: input.config
    }
  });
}

export async function listConversationPresets(orgId: string) {
  return prisma.conversationPreset.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function updateConversationPreset(
  orgId: string,
  presetId: string,
  data: Partial<{
    name: string;
    description: string | null;
    uiConfig: any;
    systemPrompt: string;
    config: any;
  }>
) {
  return prisma.conversationPreset.updateMany({
    where: {
      id: presetId,
      orgId
    },
    data
  });
}

export async function deleteConversationPreset(orgId: string, presetId: string) {
  await prisma.conversationPreset.deleteMany({
    where: {
      id: presetId,
      orgId
    }
  });
}

