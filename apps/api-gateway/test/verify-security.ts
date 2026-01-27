import fastify from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';

async function verifySecurity() {
  console.log("--- Starting Security Verification ---");
  let passed = true;

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
  } else {
      console.log("✅ Vulnerability reproduction confirmed (Baseline).");
  }

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

  if (resSecure.statusCode === 429) {
      console.log("✅ FIX VERIFIED: Rate limit enforced on real IP.");
  } else {
      console.error(`❌ FIX FAILED: Rate limit bypassed! Status: ${resSecure.statusCode}`);
      passed = false;
  }

  if (!passed) {
      process.exit(1);
  }
}

verifySecurity();
