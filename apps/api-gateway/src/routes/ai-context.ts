import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';

import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Context-Aware Endpoint for Agentic Middleware
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

    // Derive intent from recent activity
    let primaryIntent = 'Starting a new task';
    if (recentConversations.length > 0) {
      const lastConv = recentConversations[0];
      const hoursSinceLast = (Date.now() - new Date(lastConv.updatedAt).getTime()) / (1000 * 60 * 60);

      if (hoursSinceLast < 1) {
        primaryIntent = `Resuming active conversation: ${lastConv.title}`;
      } else if (hoursSinceLast < 24) {
        primaryIntent = `Following up on: ${lastConv.title}`;
      } else {
        primaryIntent = `Revisiting topic: ${lastConv.title}`;
      }
    }

    return reply.send({
      user,
      state: {
        currentOrgId: (request.headers['x-org-id'] as string) || null,
        theme: 'kinetic-glass', // 2026 standard
        timestamp: new Date().toISOString(),
        active_features: ['bento-grid', 'kinetic-refraction', 'agentic-middleware'],
        feature_flags: {
          kinetic_ui: true,
          bento_grid: true,
          agentic_middleware: true,
          eco_mode_available: true
        },
        capabilities: [
          'markdown_rendering',
          'code_execution',
          'file_upload',
          'voice_input',
          'image_generation'
        ]
      },
      navigation_history: recentConversations.map((c: any) => ({
        type: 'conversation',
        id: c.id,
        title: c.title,
        last_active: c.updatedAt,
        model: c.model
      })),
      primary_intent: primaryIntent,
      suggested_actions: [
        ...(recentConversations.length > 0 ? [{
          label: 'Resume Chat',
          action: 'resume',
          target_id: recentConversations[0].id
        }] : []),
        { label: 'New Task', action: 'create_conversation' }
      ]
    });
  });
}
