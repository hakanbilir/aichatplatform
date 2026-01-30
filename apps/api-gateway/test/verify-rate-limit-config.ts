
import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

async function verifyRateLimitConfig() {
  console.log("--- Starting Rate Limit Config Verification ---");
  let passed = true;

  const app = fastify();

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

  console.log("Testing strict limit on /auth/login...");
  // Hit /auth/login 3 times. Should be 429.
  await app.inject({ method: 'GET', url: '/auth/login' });
  await app.inject({ method: 'GET', url: '/auth/login' });
  const r3 = await app.inject({ method: 'GET', url: '/auth/login' });

  if (r3.statusCode === 429) {
    console.log("✅ Strict limit enforced on /auth/login (429 received).");
  } else {
    console.error(`❌ Strict limit FAILED on /auth/login! Status: ${r3.statusCode}`);
    passed = false;
  }

  console.log("Testing global limit on /other...");
  // Hit /other 3 times. Should be 200 (limit is 100).
  await app.inject({ method: 'GET', url: '/other' });
  await app.inject({ method: 'GET', url: '/other' });
  const o3 = await app.inject({ method: 'GET', url: '/other' });

  if (o3.statusCode === 200) {
    console.log("✅ Global limit respected on /other (200 received).");
  } else {
    console.error(`❌ Global limit FAILED on /other! Status: ${o3.statusCode}`);
    passed = false;
  }

  if (!passed) {
    process.exit(1);
  }
}

verifyRateLimitConfig();
