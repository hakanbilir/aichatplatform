# SENTINEL'S JOURNAL

## 2025-10-27 - Initial Setup
**Vulnerability:** N/A
**Learning:** Initialized security journal.
**Prevention:** N/A

## 2025-10-27 - Missing Trust Proxy Configuration
**Vulnerability:** API Gateway lacked `trustProxy: true` configuration while running behind a reverse proxy (implied by PM2/ecosystem setup). This caused the rate limiter to see all incoming requests as `127.0.0.1` (the proxy's IP). Since `127.0.0.1` was whitelisted in the rate limit configuration, external attackers could bypass rate limits entirely.
**Learning:** Default Fastify configuration does not trust proxy headers like `X-Forwarded-For`. When deploying behind a proxy (Nginx, Load Balancer), explicit configuration is required to correctly identify client IPs. The combination of "Untrusted Proxy" + "Whitelisted Localhost" is a dangerous pattern.
**Prevention:** Always configure `trustProxy` (e.g., `trustProxy: true` or specific IP ranges) in Fastify/Express when the application is not directly exposed to the internet. Verify rate limiting with mocked `X-Forwarded-For` headers in tests.

## 2026-01-27 - Permissive CORS Configuration
**Vulnerability:** API Gateway was configured with `origin: true` (reflecting request origin) alongside `credentials: true`. This allows any website to make authenticated requests to the API, bypassing CORS protections entirely.
**Learning:** Defaulting to `origin: true` for convenience in development creates a High severity risk in production. Secure defaults must be enforced via configuration (allowlist) rather than reflection.
**Prevention:** Always bind `cors` configuration to a strict `CORS_ALLOWED_ORIGINS` environment variable. Refactor server entrypoints to separate build logic from startup logic to enable proper integration testing of security configurations.
