import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    // Fetch recent conversations as "navigation history" proxy
    const recentConversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { userId: payload.userId },
          // If we had org logic here to show shared ones, we could add it.
          // For now, just user's conversations.
        ]
      },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      select: {
        id: true,
        title: true,
        updatedAt: true,
        model: true
      }
    });

    // Heuristic for intent: if they have recent conversations, they are "chatting".
    // If they are an admin and viewing settings (hard to know without client tracking), we default to "chat".
    const intent = 'chat';

    // Get current Org ID (using the first one found or from context if available)
    // For this implementation, we'll fetch the first org they are a member of.
    const firstMembership = await prisma.orgMember.findFirst({
      where: { userId: payload.userId },
      select: { orgId: true }
    });

    const context = {
      currentOrgId: firstMembership?.orgId || null,
      recentConversations,
      intent
    };

    return reply.send({
      user,
      context
    });
  });
}
