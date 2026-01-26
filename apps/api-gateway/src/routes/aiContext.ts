import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { JwtPayload } from '../auth/types';

export default async function aiContextRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.get('/ai-context', { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = req.user as JwtPayload;

    // In a real implementation, we would fetch recent activity from logs or DB.
    // For now, we return a structured context object as requested.
    const context = {
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: user.isSuperadmin ? 'superadmin' : 'member'
      },
      currentOrgId: user.orgId,
      navigationHistory: [
        // Mocked recent history as placeholder
        { path: `/orgs/${user.orgId}/usage`, timestamp: new Date().toISOString() },
        { path: `/orgs/${user.orgId}/chat`, timestamp: new Date(Date.now() - 60000).toISOString() }
      ],
      primaryIntent: "Analyzing Organization Usage",
      environment: {
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      }
    };

    return reply.send(context);
  });
}
