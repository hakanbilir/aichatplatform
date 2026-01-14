## 2026-01-13 - [Overly Permissive CORS]
**Vulnerability:** The API Gateway was configured with `origin: true` and `credentials: true`, allowing any website to make authenticated requests to the API if the user was logged in. This effectively disabled CORS protection.
**Learning:** Hardcoding security configurations (like CORS) often leads to insecure defaults. Additionally, testing entry points (`main.ts`) is challenging without proper exports, but refactoring them must account for build tool compatibility (e.g., `tsc` vs `bun` handling of `import.meta`).
**Prevention:** Always rely on centralized configuration for security policies (allowlists). Verify build tool compatibility when introducing environment checks like `import.meta.main`.
