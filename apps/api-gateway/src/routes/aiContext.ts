import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (req, _reply) => {
    const payload = req.user as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
      }
    });

    const recentConvos = await prisma.conversation.findMany({
      where: { userId: payload.userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, model: true, updatedAt: true }
    });

    // Deduce intent (naive implementation)
    const primaryIntent = recentConvos.length > 0
      ? `Continuing conversation: ${recentConvos[0].title}`
      : 'Starting new task';

    return {
      user: {
        ...user,
        role: payload.isSuperadmin ? 'superadmin' : 'user',
      },
      state: {
        currentOrgId: (req as any).tenant?.orgId || null,
        recentActivity: recentConvos.map((c: any) => ({
          type: 'conversation',
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt
        })),
        primaryIntent,
        timestamp: new Date().toISOString()
      }
    };
  });
}
