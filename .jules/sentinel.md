## 2024-06-03 - Misconfigured Rate Limiting Prefix

**Vulnerability:** Fastify Rate Limit plugin was configured with `prefix: '/auth'` but routes were mounted at `/api/v1/auth`. This caused the stricter rate limit (10 req/min) to be ignored, leaving login/signup endpoints protected only by the global rate limit (100 req/min).

**Learning:** `fastify-rate-limit`'s `prefix` option must match the route path exactly or the prefix under which routes are registered. It does not automatically find "auth" related routes.

**Prevention:** Always verify rate limiting configuration matches the actual route paths. Use integration tests to verify rate limits are applied correctly.
