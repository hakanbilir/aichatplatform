// apps/api-gateway/src/services/knowledgeSpaces.ts

import { prisma } from '@ai-chat/db';

export async function listSpaces(orgId: string) {
  return prisma.knowledgeSpace.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function createSpace(orgId: string, name: string): Promise<{ id: string }> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  const space = await prisma.knowledgeSpace.create({
    data: {
      orgId,
      name,
      slug
    }
  });

  return { id: space.id };
}

