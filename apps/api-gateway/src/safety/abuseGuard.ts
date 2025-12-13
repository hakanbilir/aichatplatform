// apps/api-gateway/src/safety/abuseGuard.ts

import { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '@ai-chat/db';

// Example: limit N messages per minute per user per org
const MAX_MESSAGES_PER_MINUTE = 60;

export async function abuseRateGuard(request: FastifyRequest, reply: FastifyReply) {
  const { orgId } = request.params as any;
  const user = request.user as any;

  // Check BlockedUser table
  const blocked = await prisma.blockedUser.findFirst({
    where: {
      orgId,
      userId: user.userId,
      OR: [{ until: null }, { until: { gt: new Date() } }]
    }
  });

  if (blocked) {
    return reply.code(403).send({
      error: 'USER_BLOCKED',
      reason: blocked.reason
    });
  }

  // Simple rate check using message logs
  const oneMinuteAgo = new Date(Date.now() - 60_000);

  const recentMessagesCount = await prisma.message.count({
    where: {
      orgId,
      authorId: user.userId,
      createdAt: { gt: oneMinuteAgo }
    }
  });

  if (recentMessagesCount > MAX_MESSAGES_PER_MINUTE) {
    return reply.code(429).send({
      error: 'RATE_LIMITED',
      reason: 'Too many messages per minute. Please slow down.'
    });
  }
}
