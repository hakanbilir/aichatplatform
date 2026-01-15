## 2026-01-14 - Centralized CORS Configuration
**Vulnerability:** The API Gateway was configured with `origin: true` and `credentials: true`, which effectively disables CORS protection while allowing credentials, posing a high security risk.
**Learning:** Security configurations, especially critical ones like CORS, should not be hardcoded or left permissive in individual application entry points. They must be centralized and validated strictly.
**Prevention:** Enforce the use of `CORS_ALLOWED_ORIGINS` from the shared `config` package across all services to ensure consistent and restrictive CORS policies.
