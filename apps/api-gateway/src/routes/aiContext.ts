import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        isSuperadmin: true
      }
    });

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const orgId = payload.orgId;
    let org = null;
    let recentConversations = [];

    if (orgId) {
      org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, slug: true, plan: true }
      });

      // Get recent navigation history (simulated via recent conversations)
      recentConversations = await prisma.conversation.findMany({
        where: {
          orgId,
          messages: { some: { authorId: user.id } }
        },
        orderBy: { lastActivityAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          model: true,
          lastActivityAt: true
        }
      });
    }

    // "Primary Intent" - Inferred from recent activity
    const primaryIntent = recentConversations.length > 0
        ? `Continuing conversation: ${recentConversations[0].title || 'Untitled'}`
        : 'Starting new task';

    return reply.send({
      user,
      organization: org,
      state: {
        currentRoute: '/dashboard', // Placeholder as backend doesn't know client route
        lastActive: recentConversations[0]?.lastActivityAt || new Date(),
      },
      navigationHistory: recentConversations.map((c: any) => ({
        type: 'conversation',
        id: c.id,
        title: c.title,
        timestamp: c.lastActivityAt
      })),
      primaryIntent
    });
  });
}
