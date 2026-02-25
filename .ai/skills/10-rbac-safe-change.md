# Name

10-rbac-safe-change

# Goal

Modify authorization logic safely without privilege escalation regressions.

# Trigger / When to Use

When changing org roles, permission checks, guards, or protected routes.

# Scope Detection (Repo-Derived)

- `apps/api-gateway/src/rbac/roles.ts`
- `apps/api-gateway/src/plugins/guards.ts`
- `apps/api-gateway/src/routes/*`
- `apps/api-gateway/test/*security*.test.ts`

# Inputs

- Role/permission change request.
- Related route handlers and tests.

# Procedure (Deterministic Steps)

1. Update permission model in `roles.ts` (or equivalent source of truth).
2. Update guard assertions in plugins/routes.
3. Add/adjust security tests for positive and negative access paths.
4. Run API lint/typecheck/tests/build.
5. Run root `bun run ci` for parity if shared contracts are touched.

# Guardrails

- Deny-by-default for unspecified roles.
- Never allow `SUPERADMIN` assignment through org-scoped role mutation paths unless explicitly intended and tested.

# Acceptance Checks (Commands)

- `bun --cwd apps/api-gateway run lint`
- `bun --cwd apps/api-gateway run typecheck`
- `bun --cwd apps/api-gateway run test`
- `bun --cwd apps/api-gateway run build`

# Failure Modes & Recovery

- Privilege escalation test fails: revert permission diff and re-specify matrix.
- Guard bypass discovered: add explicit guard test before patch merge.

# Outputs

- Updated RBAC logic and security tests.
