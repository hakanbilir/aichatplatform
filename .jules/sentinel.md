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

## 2026-02-19 - Privilege Escalation in Organization Member Management
**Vulnerability:** Organization member management endpoints (`POST`, `PATCH`, `DELETE` in `orgs.ts`) allowed users with `ADMIN` role to assign the `OWNER` role to themselves or others, or to modify/delete existing `OWNER` accounts. The code only checked for `member:invite` or `member:update` permissions, which `ADMIN`s possess, without verifying if the target role was higher than the requester's role.
**Learning:** Role-Based Access Control (RBAC) permissions (e.g., `can_update_members`) are often insufficient for hierarchical role management. "Permission to update" implies "permission to update anyone lower than me", but code often implements it as "permission to update anyone". Explicit checks against role hierarchy are necessary when roles can manage other roles.
**Prevention:** In member management logic, always compare the requester's role against both the *target member's role* and the *newly assigned role*. Ensure that a user cannot assign a role higher than their own, nor modify a user with a role equal to or higher than their own (unless they are a Superadmin or the logic explicitly allows peer-editing).

## 2026-02-21 - Inconsistent Password Validation in Superadmin APIs
**Vulnerability:** While public signup endpoints enforced strong password complexity (uppercase, lowercase, number), the superadmin user creation and password reset endpoints only enforced a minimum length. This allowed administrators to inadvertently create weak accounts or reset users to weak passwords, bypassing the application's security policy.
**Learning:** Security policies (like password strength) must be applied universally, not just at the "front door". When creating administrative overrides or "super" endpoints, it's easy to copy-paste simpler schemas, forgetting that the same security constraints should apply to the data itself, regardless of who is creating it.
**Prevention:** Centralize security-critical validation logic (e.g., `passwordSchema`) in a shared module (`validation.ts`) and import it everywhere. Do not redefine validation rules in multiple places.

## 2026-02-22 - Missing Permission Check on Chat Routes
**Vulnerability:** The chat message endpoints (`/conversations/:id/messages` and `/stream`) verified that a user was a member of the organization owning the conversation, but failed to verify that the user had the specific `conversation:chat` permission. This allowed users with the `VIEWER` role (who are members but lack chat permissions) to send messages and consume LLM resources.
**Learning:** Membership in a resource's parent scope (e.g., Organization) does not imply permission to perform all actions on that resource. Checking "Is this user in the org?" is an authentication/scoping check, not an authorization check. Explicit RBAC permission checks must always follow scoping checks.
**Prevention:** Always pair resource retrieval (scoping) with `assertOrgPermission` (authorization) when the resource belongs to an organization. Ensure that every endpoint has a corresponding permission check, even if it seems "implied" by access.

## 2026-03-01 - Overly Permissive Message Deletion
**Vulnerability:** The message deletion endpoint (`DELETE /conversations/:id/messages/:messageId`) relied solely on the `conversation:chat` permission, which is granted to all Organization Members. This allowed any Member to delete messages sent by other users (including Admins/Owners) in any conversation they had access to, leading to potential data loss or sabotage.
**Learning:** "Can Chat" permission does not equate to "Can Manage Chat". Granular actions (like deleting messages) often require finer-grained checks (e.g., "Is this MY message?") or higher privilege levels (Admin/Owner), rather than a blanket feature flag.
**Prevention:** For destructive actions on shared resources (like messages in a group context), verify ownership (`authorId === userId`) in addition to general feature access. Restrict administrative deletion to specific roles (Admin/Owner) or separate `manage` permissions.
