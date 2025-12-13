// apps/api-gateway/src/services/orgAiPolicy.ts

import { prisma } from '@ai-chat/db';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - Prisma types are available via workspace
import type { Prisma } from '@prisma/client';

export interface OrgAiPolicyConfig {
  tone?: 'formal' | 'casual' | 'neutral';
  disallowTopics?: string[]; // e.g. ["politics", "medical"]
  extra?: Record<string, any>;
}

export interface OrgAiPolicyDto {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  systemPrompt: string;
  config: OrgAiPolicyConfig;
}

export async function getOrgAiPolicy(orgId: string): Promise<OrgAiPolicyDto | null> {
  const row = await prisma.orgAiPolicy.findUnique({ where: { orgId } });
  if (!row) return null;

  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    config: row.config as OrgAiPolicyConfig
  };
}

export async function upsertOrgAiPolicy(params: {
  orgId: string;
  name: string;
  description?: string | null;
  systemPrompt: string;
  config?: OrgAiPolicyConfig;
}): Promise<OrgAiPolicyDto> {
  const row = await prisma.orgAiPolicy.upsert({
    where: { orgId: params.orgId },
    update: {
      name: params.name,
      description: params.description ?? null,
      systemPrompt: params.systemPrompt,
      config: (params.config ?? {}) as unknown as Prisma.InputJsonValue
    },
    create: {
      orgId: params.orgId,
      name: params.name,
      description: params.description ?? null,
      systemPrompt: params.systemPrompt,
      config: (params.config ?? {}) as unknown as Prisma.InputJsonValue
    }
  });

  return {
    id: row.id,
    orgId: row.orgId,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    config: row.config as OrgAiPolicyConfig
  };
}

