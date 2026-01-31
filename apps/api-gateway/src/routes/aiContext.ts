import { FastifyInstance } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance) {
  app.get(
    '/ai-context',
    {
      preValidation: [app.authenticate],
    },
    async (req, _reply) => {
      const payload = req.user as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        include: {
          orgMemberships: {
            where: { orgId: payload.orgId || undefined },
            include: { org: true }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Fetch recent conversations for context
      const recentConversations = await prisma.conversation.findMany({
        where: {
          userId: user.id,
        },
        orderBy: {
          updatedAt: 'desc',
        },
        take: 5,
        select: {
          id: true,
          title: true,
          updatedAt: true,
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              content: true,
            },
          },
        },
      });

      // Construct the context object
      const context = {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.orgMemberships[0]?.role || 'MEMBER',
        },
        environment: {
          userAgent: req.headers['user-agent'],
          language: req.headers['accept-language'],
        },
        recentHistory: recentConversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          lastActive: c.updatedAt,
          snippet: c.messages[0]?.content.substring(0, 100) || '',
        })),
        primaryIntent: 'browsing',
        suggestedActions: [
            { label: 'Resume last chat', action: 'navigate', target: `/chat/${recentConversations[0]?.id || 'new'}` },
            { label: 'View analytics', action: 'navigate', target: `/orgs/${payload.orgId || 'me'}/analytics` }
        ]
      };

      return context;
    }
  );
}
