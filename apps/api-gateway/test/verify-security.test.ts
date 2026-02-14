import { describe, test, expect } from 'bun:test';
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

describe('Security Verification', () => {
  test('should verify vulnerability reproduction (Baseline)', async () => {
    // 1. Verify that WITHOUT trustProxy, vulnerability exists (simulation)
    // We simulate the "bad" state to confirm our test logic is sound
    const appVulnerable = fastify({
      // trustProxy: false (default)
    });

    await appVulnerable.register(fastifyRateLimit, {
      max: 1,
      timeWindow: '1 minute',
      allowList: ['127.0.0.1'],
    });

    appVulnerable.get('/', async () => 'ok');

    // Req 1: User A
    await appVulnerable.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '10.0.0.1' }
    });

    // Req 2: User A (Expect 200 due to bypass)
    const resVulnerable = await appVulnerable.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '10.0.0.1' }
    });

    if (resVulnerable.statusCode !== 200) {
        console.warn("⚠️ Warning: Vulnerability reproduction failed. Simulation might be inaccurate.");
    }

    // We expect 200 because without trustProxy, Fastify uses remoteAddress (127.0.0.1) which is allowListed
    expect(resVulnerable.statusCode).toBe(200);
  });

  test('should verify fix: Rate limit enforced on real IP', async () => {
    // 2. Verify that WITH trustProxy, vulnerability is fixed
    // This matches the current production code
    const appSecure = fastify({
      trustProxy: true
    });

    await appSecure.register(fastifyRateLimit, {
      max: 1,
      timeWindow: '1 minute',
      allowList: ['127.0.0.1'],
    });

    appSecure.get('/', async () => 'ok');

    // Req 1: User B
    await appSecure.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '10.0.0.2' }
    });

    // Req 2: User B (Expect 429)
    const resSecure = await appSecure.inject({
      method: 'GET',
      url: '/',
      remoteAddress: '127.0.0.1',
      headers: { 'x-forwarded-for': '10.0.0.2' }
    });

    expect(resSecure.statusCode).toBe(429);
  });
});
