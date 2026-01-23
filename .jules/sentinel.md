## 2026-01-23 - [Overly Permissive CORS]
**Vulnerability:** The API Gateway used `origin: true` and `credentials: true` for CORS, allowing any website to make authenticated requests if they knew the endpoint.
**Learning:** Fastify's `cors` plugin with `origin: true` reflects the request origin, which bypasses Same-Origin Policy protections when credentials are allowed.
**Prevention:** Enforce an allowlist of origins via `CORS_ALLOWED_ORIGINS` configuration.
