import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';

import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true }
    });

    // Get recent conversations as a proxy for history/intent
    const recentConversations = await prisma.conversation.findMany({
      where: { userId: payload.userId },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, model: true, updatedAt: true, orgId: true }
    });

    // Mock intent analysis
    const primaryIntent = recentConversations.length > 0
      ? `Continuing conversation about ${recentConversations[0].title}`
      : 'Starting a new task';

    return reply.send({
      user,
      state: {
        currentOrgId: (request.headers['x-org-id'] as string) || null,
        theme: 'kinetic-glass', // 2026 standard
      },
      navigation_history: recentConversations.map((c: any) => ({
        type: 'conversation',
        id: c.id,
        title: c.title,
        timestamp: c.updatedAt
      })),
      primary_intent: primaryIntent
    });
  });
}
