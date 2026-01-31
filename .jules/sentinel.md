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

## 2026-01-30 - IDOR in Organization Member Management
**Vulnerability:** The API endpoints for updating (`PATCH`) and deleting (`DELETE`) organization members in `orgs.ts` relied solely on the `id` of the member resource. Although `assertOrgPermission` verified that the caller had administrative rights on the target organization, it did not verify that the member resource actually belonged to that organization. An attacker with admin rights on *any* organization could update or delete members of *any other* organization by guessing or obtaining their member ID (UUID).
**Learning:** Checking permissions on the parent resource (Organization) is not sufficient when operating on child resources (Members) by their global ID. You must always verify the relationship between the parent and child resource.
**Prevention:** Always verify ownership before performing updates or deletes. Use `findUnique` to fetch the record and check its `orgId` (or parent ID) against the authorized context before proceeding. Alternatively, include the parent ID in the `where` clause if the database schema and ORM support compound lookups easily.

## 2026-02-05 - Ineffective Rate Limiting Configuration
**Vulnerability:** The rate limiter plugin was registered multiple times on the same Fastify instance with different prefixes, intending to create stricter limits for auth and chat routes. However, `fastify-rate-limit` does not support route filtering via the `prefix` option when registered globally, and multiple registrations overwrite each other. This resulted in the global rate limit being replaced by the last registered configuration (or unpredictable behavior), effectively bypassing the intended 10 req/min limit for auth.
**Learning:** Fastify plugins like `rate-limit` are typically encapsulated, but when registered on the root instance without a new context (like `register(plugin, { prefix: ... })` vs passing prefix in options), they share the same state. Correct usage requires registering the limiter once globally and overriding settings per-route using the `config` object.
**Prevention:** Avoid registering the same plugin multiple times unless it is designed for it. Use the `config` property in route definitions to override plugin defaults for specific endpoints (e.g., `config: { rateLimit: { max: 5 } }`).

## 2026-02-17 - Unvalidated Role Input in Admin APIs
**Vulnerability:** The organization admin endpoints (`invite` and `updateRole`) accepted any string as a `role`, relying on the database to enforce constraints. This could lead to 500 errors (unhandled enum rejection) and potentially allowed privilege escalation if restricted roles like `SUPERADMIN` were passed (which were valid enum values but intended to be restricted).
**Learning:** Zod schemas often default to `z.string()` for simplicity during development. When mapping to database enums, strict validation `z.enum([...])` is crucial not just for data integrity but for security (preventing assignment of higher-privilege roles that exist in the DB but shouldn't be grantable via API).
**Prevention:** Always use `z.enum()` or `z.nativeEnum()` in API validation layers when the underlying data model uses an enum. Explicitly whitelist allowed values rather than blacklisting or relying on database constraints.

## 2026-02-17 - Unvalidated API Key Scopes
**Vulnerability:** The `scopes` field in API Key creation/update was validated only as an array of strings, allowing administrators to create keys with nonsensical or potentially undefined permissions.
**Learning:** TypeScript types (unions) are erased at runtime. To validate inputs against these types, you must maintain a runtime-accessible list (e.g., a constant array) that acts as the source of truth for both the type and the validation logic.
**Prevention:** Define permissions as a `const` array (using `as const`), derive the TypeScript type from it (`typeof ARRAY[number]`), and use the array in Zod schemas (`z.enum(ARRAY)`).
