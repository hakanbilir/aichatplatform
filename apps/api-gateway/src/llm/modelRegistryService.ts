// apps/api-gateway/src/llm/modelRegistryService.ts

import { prisma } from '@ai-chat/db';

export async function resolveModelForOrg(orgId: string, provider: string, modelName: string) {
  // Org override first
  const orgEntry = await prisma.modelRegistryEntry.findFirst({
    where: { orgId, provider, modelName }
  });

  const globalEntry = await prisma.modelRegistryEntry.findFirst({
    where: { orgId: null, provider, modelName }
  });

  const entry = orgEntry ?? globalEntry;

  if (!entry || !entry.isEnabled) {
    throw new Error(`Model ${provider}:${modelName} is not enabled for org ${orgId}`);
  }

  return entry;
}
