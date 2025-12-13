// apps/api-gateway/src/services/orgIntegrations.ts

import { prisma } from '@ai-chat/db';
import { IntegrationProviderKey } from '../integrations/types';
import { getIntegrationProvider } from '../integrations/registry';

export interface CreateOrgIntegrationInput {
  orgId: string;
  providerKey: IntegrationProviderKey;
  name: string;
  credentials: any;
  config?: any;
}

export async function createOrgIntegration(input: CreateOrgIntegrationInput) {
  const provider = getIntegrationProvider(input.providerKey);
  if (!provider) {
    throw new Error(`Unknown provider: ${input.providerKey}`);
  }

  const providerRow = await prisma.integrationProvider.upsert({
    where: { key: provider.key },
    update: {},
    create: {
      key: provider.key,
      name: provider.name,
      description: provider.description,
      manifest: {},
    },
  });

  const integration = await prisma.orgIntegration.create({
    data: {
      orgId: input.orgId,
      providerId: providerRow.id,
      name: input.name,
      isEnabled: true,
      credentials: input.credentials,
      config: input.config ?? {},
    },
  });

  return integration;
}

export async function listOrgIntegrations(orgId: string) {
  return prisma.orgIntegration.findMany({
    where: { orgId },
    include: {
      provider: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export async function updateOrgIntegration(
  orgId: string,
  integrationId: string,
  data: { name?: string; isEnabled?: boolean; config?: any },
) {
  // Enforce org scoping in the where clause
  return prisma.orgIntegration.updateMany({
    where: {
      id: integrationId,
      orgId,
    },
    data: {
      name: data.name,
      isEnabled: data.isEnabled,
      config: data.config,
    },
  });
}

export async function deleteOrgIntegration(orgId: string, integrationId: string) {
  await prisma.orgIntegration.deleteMany({
    where: {
      id: integrationId,
      orgId,
    },
  });
}

