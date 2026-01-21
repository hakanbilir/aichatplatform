## 2024-05-23 - [Effective Rate Limiting in Fastify]
**Vulnerability:** Ineffective rate limiting on sensitive endpoints (`/auth` and `/conversations`).
**Learning:** `fastify-rate-limit` registered with a `prefix` only applies to routes registered *within the same plugin context*. Routes registered separately (even if they match the URL prefix) bypass the rate limiter.
**Prevention:** Apply rate limiting directly to sensitive routes using the route's `config` object (`config: { rateLimit: { max: N, timeWindow: '1 minute' } }`) to ensure it is strictly enforced regardless of plugin scope.
