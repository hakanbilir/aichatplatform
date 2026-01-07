## Sentinel's Security Journal

This journal tracks CRITICAL security learnings, vulnerability patterns, and architectural gaps found in the codebase.

Format:
## YYYY-MM-DD - [Title]
**Vulnerability:** [What you found]
**Learning:** [Why it existed]
**Prevention:** [How to avoid next time]

---

## 2025-02-17 - Secure CORS Configuration
**Vulnerability:** The API Gateway was configured with `origin: true`, allowing any site to access the API with credentials (reflected origin), which enables cross-origin attacks if cookies/auth headers are present.
**Learning:** Defaulting to permissive CORS settings in development often leaks into production if not explicitly managed.
**Prevention:** Added `CORS_ALLOWED_ORIGINS` configuration to `packages/config` to restrict access to trusted domains only.
