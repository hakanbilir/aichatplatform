// apps/api-gateway/src/plugins/security.ts

import fp from 'fastify-plugin';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { getConfig } from '@ai-chat/config';

const config = getConfig();

async function securityPlugin(app: FastifyInstance) {
  // Security headers (Helmet)
  // Güvenlik başlıkları (Helmet)
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding if needed
  });

  // Global rate limiting
  // Global rate limiting
  // Note: Route-specific overrides are handled via route config: { rateLimit: ... }
  await app.register(fastifyRateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_TIME_WINDOW_MS,
    allowList: ['127.0.0.1', '::1'], // Allow localhost
    hook: 'onRequest',
  });
}

export default fp(securityPlugin);
