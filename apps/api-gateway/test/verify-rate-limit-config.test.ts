import { describe, test, expect, beforeAll } from 'bun:test';
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

describe('Rate Limit Config Verification', () => {
  let app: any;

  beforeAll(async () => {
    app = fastify();

    // Register global rate limit ONCE (Mimics security.ts correct state)
    await app.register(fastifyRateLimit, {
      max: 100,
      timeWindow: '1 minute',
    });

    // Route with stricter limit (Mimics auth.ts)
    app.get('/auth/login', {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: '1 minute'
        }
      }
    }, async () => {
      return { ok: true };
    });

    // Route with global limit (Mimics other routes)
    app.get('/other', async () => {
      return { ok: true };
    });
  });

  test('should enforce strict rate limit on /auth/login', async () => {
    // Hit /auth/login 3 times. Should be 429 on 3rd.
    await app.inject({ method: 'GET', url: '/auth/login' });
    await app.inject({ method: 'GET', url: '/auth/login' });
    const r3 = await app.inject({ method: 'GET', url: '/auth/login' });

    if (r3.statusCode !== 429) {
        console.error(`❌ Strict limit FAILED on /auth/login! Status: ${r3.statusCode}`);
    }
    expect(r3.statusCode).toBe(429);
  });

  test('should respect global rate limit on /other', async () => {
    // Hit /other 3 times. Should be 200 (limit is 100).
    await app.inject({ method: 'GET', url: '/other' });
    await app.inject({ method: 'GET', url: '/other' });
    const o3 = await app.inject({ method: 'GET', url: '/other' });

    if (o3.statusCode !== 200) {
        console.error(`❌ Global limit FAILED on /other! Status: ${o3.statusCode}`);
    }
    expect(o3.statusCode).toBe(200);
  });
});
