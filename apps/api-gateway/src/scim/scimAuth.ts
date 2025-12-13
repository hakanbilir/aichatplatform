// apps/api-gateway/src/scim/scimAuth.ts

import { prisma } from '@ai-chat/db';
import { FastifyRequest } from 'fastify';

export async function validateScimBearerToken(
  req: FastifyRequest
): Promise<{ orgId: string; connectionId: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);

  const connection = await prisma.scimConnection.findUnique({
    where: { bearerToken: token },
    include: { org: true }
  });

  if (!connection || !connection.isEnabled) {
    return null;
  }

  return {
    orgId: connection.orgId,
    connectionId: connection.id
  };
}
