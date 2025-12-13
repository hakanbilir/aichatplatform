// apps/api-gateway/src/services/promptTemplates.ts

import { prisma } from '@ai-chat/db';

export interface PromptTemplateInput {
  orgId: string;
  createdById: string;
  name: string;
  description?: string | null;
  systemPrompt: string;
  userPrefix?: string | null;
  assistantStyle?: string | null;
  variables?: Record<string, any>;
  metadata?: Record<string, any>;
}

export async function createPromptTemplate(input: PromptTemplateInput) {
  return prisma.promptTemplate.create({
    data: {
      orgId: input.orgId,
      createdById: input.createdById,
      name: input.name,
      description: input.description ?? null,
      versions: {
        create: {
          version: 1,
          systemPrompt: input.systemPrompt,
          userPrefix: input.userPrefix ?? null,
          assistantStyle: input.assistantStyle ?? null,
          variables: input.variables ?? {},
          metadata: input.metadata ?? {},
          createdById: input.createdById
        }
      }
    }
  });
}

export async function listPromptTemplates(orgId: string) {
  return prisma.promptTemplate.findMany({
    where: { orgId, isArchived: false },
    orderBy: { createdAt: 'desc' },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1
      }
    }
  });
}

export async function updatePromptTemplate(
  orgId: string,
  templateId: string,
  data: Partial<{
    name: string;
    description: string | null;
    isArchived: boolean;
  }>
) {
  return prisma.promptTemplate.updateMany({
    where: {
      id: templateId,
      orgId
    },
    data
  });
}

export async function deletePromptTemplate(orgId: string, templateId: string) {
  await prisma.promptTemplate.deleteMany({
    where: {
      id: templateId,
      orgId
    }
  });
}

export async function recordPromptUsage(params: {
  orgId: string;
  templateId: string;
  userId: string;
  conversationId: string;
}) {
  await prisma.promptUsage.create({
    data: {
      orgId: params.orgId,
      templateId: params.templateId,
      userId: params.userId,
      conversationId: params.conversationId
    }
  });
}

