# SENTINEL'S JOURNAL

## 2025-10-27 - Initial Setup
**Vulnerability:** N/A
**Learning:** Initialized security journal.
**Prevention:** N/A

## 2025-10-27 - Missing Trust Proxy Configuration
**Vulnerability:** API Gateway lacked `trustProxy: true` configuration while running behind a reverse proxy (implied by PM2/ecosystem setup). This caused the rate limiter to see all incoming requests as `127.0.0.1` (the proxy's IP). Since `127.0.0.1` was whitelisted in the rate limit configuration, external attackers could bypass rate limits entirely.
**Learning:** Default Fastify configuration does not trust proxy headers like `X-Forwarded-For`. When deploying behind a proxy (Nginx, Load Balancer), explicit configuration is required to correctly identify client IPs. The combination of "Untrusted Proxy" + "Whitelisted Localhost" is a dangerous pattern.
**Prevention:** Always configure `trustProxy` (e.g., `trustProxy: true` or specific IP ranges) in Fastify/Express when the application is not directly exposed to the internet. Verify rate limiting with mocked `X-Forwarded-For` headers in tests.

## 2025-12-16 - Weak Password Policy
**Vulnerability:** The application allowed users to sign up with weak passwords (e.g., "password", "12345678") because the Zod schema only enforced a minimum length of 8 characters. The password strength validation helper was only used for demo mode auto-created accounts, not for regular user signups.
**Learning:** Having a validation helper function doesn't mean it's being used. Always verify that validation logic is applied to the public-facing route handlers. Zod schemas are a great place to enforce these rules centrally as they can be easily tested and reused.
**Prevention:** Enforce password complexity (uppercase, lowercase, number, special char) directly in the Zod schema using `.regex()` or `.refine()`. Create explicit tests for password policy to ensure it doesn't degrade over time.

## 2026-01-29 - Insecure CORS Configuration
**Vulnerability:** API Gateway was configured with `origin: true` and `credentials: true`. This reflects the `Origin` header, allowing any website to make authenticated requests.
**Learning:** `fastify-cors` with `origin: true` is convenient but dangerous when combined with credentials. It is equivalent to `Access-Control-Allow-Origin: *` but supports credentials (which `*` does not).
**Prevention:** Always use an explicit allowlist for origins. Validate `origin` against a configured list (e.g., `CORS_ALLOWED_ORIGINS`).
