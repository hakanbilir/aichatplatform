import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';

import { JwtPayload } from '../auth/types';

/**
 * Agentic Middleware (2026 Standards)
 * Exposes /ai-context for context-aware agents.
 */
export default async function aiContextRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Context-Aware Endpoint for Agentic Middleware
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;

    // ⚡ Bolt: Fetch user and recent conversations concurrently
    // 💡 What: Used Promise.all to run independent database queries in parallel.
    // 🎯 Why: Previously, these queries ran sequentially, causing the second query to wait for the first to complete.
    // 📊 Impact: Reduces total database query latency by roughly the duration of the shorter query, making the /ai-context endpoint faster.
    // 🔬 Measurement: Verify endpoint latency using a tool like Postman or the browser's Network tab.
    const [user, recentConversations] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, name: true },
      }),
      // Get recent conversations as a proxy for history/intent
      prisma.conversation.findMany({
        where: { userId: payload.userId },
        take: 5,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, model: true, updatedAt: true, orgId: true },
      }),
    ]);

    // Derive intent from recent activity
    let primaryIntent = 'Starting a new task';
    if (recentConversations.length > 0) {
      const lastConv = recentConversations[0];
      const hoursSinceLast =
        (Date.now() - new Date(lastConv.updatedAt).getTime()) / (1000 * 60 * 60);

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
          eco_mode_available: true,
        },
        capabilities: [
          'markdown_rendering',
          'code_execution',
          'file_upload',
          'voice_input',
          'image_generation',
        ],
      },
      navigation_history: recentConversations.map((c: any) => ({
        type: 'conversation',
        id: c.id,
        title: c.title,
        last_active: c.updatedAt,
        model: c.model,
      })),
      primary_intent: primaryIntent,
      suggested_actions: [
        ...(recentConversations.length > 0
          ? [
              {
                label: 'Resume Chat',
                action: 'resume',
                target_id: recentConversations[0].id,
              },
            ]
          : []),
        { label: 'New Task', action: 'create_conversation' },
      ],
    });
  });
}
