// apps/api-gateway/src/observability/logger.ts

import pino from 'pino';
import { getConfig } from '@ai-chat/config';

const config = getConfig();

// Logger configuration object for Fastify
// Fastify için logger yapılandırma nesnesi
export const loggerConfig = {
  level: config.LOG_LEVEL,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label: string) {
      return { level: label };
    },
  },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.passphrase',
      'req.body.refreshToken',
      'req.body.token',
      'res.body.token',
      'res.body.refreshToken',
      'passwordHash',
      'secret',
      'apiKey',
      'bearerToken',
      'credentials',
      'apiKeyEncrypted'
    ],
    remove: true
  }
};

// Logger instance for use elsewhere in the codebase
// Kod tabanının diğer yerlerinde kullanım için logger örneği
export const logger = pino(loggerConfig);

