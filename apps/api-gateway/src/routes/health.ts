// apps/api-gateway/src/routes/health.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { getConfig } from '@ai-chat/config';

export default async function healthRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Root route - API information
  // Kök route - API bilgisi
  app.get('/', async (_request, reply) => {
    return reply.send({
      name: 'AI Chat Platform API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/healthz',
        readiness: '/readyz',
        metrics: '/metrics',
        api: '/api/v1',
      },
    });
  });

  app.get('/healthz', async (_request, reply) => {
    return reply.send({ status: 'ok' });
  });

  app.get('/readyz', async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (err) {
      return reply.code(503).send({ status: 'error', reason: 'db_unreachable' });
    }

    // Optionally: check Ollama
    const config = getConfig();
    try {
      const res = await fetch(`${config.OLLAMA_BASE_URL}/api/tags`);
      if (!res.ok) {
        return reply.code(503).send({ status: 'error', reason: 'ollama_unhealthy' });
      }
    } catch {
      return reply.code(503).send({ status: 'error', reason: 'ollama_unreachable' });
    }

    return reply.send({ status: 'ok' });
  });
}

