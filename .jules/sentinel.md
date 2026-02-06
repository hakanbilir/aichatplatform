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

## 2026-03-03 - Privilege Escalation via API Keys
**Vulnerability:** The API Key creation and update endpoints (`POST` and `PATCH` in `orgApiKeys.ts`) allowed administrators (`ADMIN` role) to create API keys with any scope defined in `ALL_PERMISSIONS`, including scopes they did not possess themselves (e.g., `org:billing:write`, `org:delete`). This allowed an Admin to escalate privileges by creating a "super-key" and using it to perform OWNER-only actions.
**Learning:** Delegation of authority must be strictly bounded by the delegator's own authority. You cannot give what you do not have. When a user creates a secondary credential (like an API key or PAT), the system must verify that the permissions assigned to that credential are a subset of the user's current permissions.
**Prevention:** In API key generation logic, capture the creator's current role or permission set. Iterate through the requested scopes for the new key and validate that the creator holds each specific permission. Reject the request if any scope exceeds the creator's authority.

## 2026-03-05 - IDOR in Conversation Update
**Vulnerability:** The conversation update endpoint (`PATCH /conversations/:id`) allowed any Organization Member with `conversation:chat` permission to modify any conversation within the organization, including those created by other users (e.g., Owners). This allowed unauthorized modification of conversation titles, system prompts, and settings.
**Learning:** Broad permissions like `conversation:chat` (read/write access to chat) do not imply ownership or administrative rights over the conversation resource itself. Just because a user can "chat" in a conversation (which implies writing messages) does not mean they should be able to reconfigure the conversation settings.
**Prevention:** Implement strict ownership checks for resource modification. Users should generally only be able to modify their own resources unless they hold an administrative role (e.g., ADMIN/OWNER) or a specific "manage" permission. Always verify `resource.userId === requester.userId` alongside RBAC checks.

## 2026-03-08 - Stale JWT Privileges in Superadmin Authentication
**Vulnerability:** Superadmin endpoints relied solely on the  claim present in the JWT payload for authorization. This meant that if a user's superadmin status was revoked in the database, they could still access superadmin endpoints until their existing token expired (up to 1 hour), creating a window of opportunity for malicious actions after revocation.
**Learning:** Stateless authentication (JWT) is excellent for performance but dangerous for high-privilege revocation. Trusting the token's claims implicitly trade security for speed. Critical security boundaries (like Superadmin access) require immediate consistency, which JWTs cannot provide alone.
**Prevention:** For high-sensitivity checks (Superadmin, financial operations, security configuration), always perform a database lookup to verify the user's current status and role, ignoring the cached claims in the JWT. This "double-check" ensures that revocation is respected instantly.

## 2026-03-09 - SSRF in Webhooks
**Vulnerability:** The webhook dispatcher in `worker-jobs` utilized `fetch` with user-provided URLs without any validation. This exposed a Server-Side Request Forgery (SSRF) vulnerability, allowing an attacker with integration permissions to probe internal services or cloud metadata (e.g., AWS Instance Metadata) by configuring a webhook URL pointing to a private IP (e.g., `169.254.169.254`, `127.0.0.1`, or `0.0.0.0`).
**Learning:** `fetch` APIs (Node/Bun/Browser) are designed for general web access and automatically follow redirects and resolve DNS. In a backend context where users supply URLs, "just fetching" is insecure. Private network access must be explicitly blocked. Additionally, `0.0.0.0` often resolves to localhost on Unix systems and is a common bypass for simple "is localhost" checks.
**Prevention:** Implement a strict URL validator that: 1) Resolves the hostname to ALL its IP addresses (checking for private ranges including IPv4 mapped IPv6 and `0.0.0.0`), 2) Validates the URL *before* the request, and 3) Disables automatic redirects in the HTTP client (`redirect: 'error'`) to prevent Open Redirect attacks from bypassing the initial IP check.
