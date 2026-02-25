# Name

02-safe-editing-protocol

# Goal

Apply minimal, reversible edits without breaking contracts, RBAC, or i18n.

# Trigger / When to Use

Use for every non-doc code change.

# Scope Detection (Repo-Derived)

- API and auth surfaces: `apps/api-gateway/src/routes`, `apps/api-gateway/src/plugins/guards.ts`, `apps/api-gateway/src/rbac/roles.ts`.
- Shared contracts: `packages/core-types/src`, `packages/db/prisma/schema.prisma`.
- i18n resources: `apps/api-gateway/src/i18n/locales`, `apps/web/src/i18n/locales`.

# Inputs

- Target files to modify.
- Relevant tests and scripts from `/.ai/repo-facts.json`.

# Procedure (Deterministic Steps)

1. Run intake and identify impacted targets.
2. Locate existing patterns and reusable utilities in the same scope.
3. Edit the smallest viable file set.
4. If changing contracts or roles, update dependent types/tests in the same change.
5. Run target-scoped lint/type/test/build commands.
6. Run root CI parity (`bun run ci`) before merge when changes cross multiple targets.

# Guardrails

- No TODO/FIXME placeholders.
- No silent widening of permissions.
- No removal of translation keys without replacement.

# Acceptance Checks (Commands)

- `bun --cwd <impacted-target-path> run lint`
- `bun --cwd <impacted-target-path> run typecheck`
- `bun --cwd <impacted-target-path> run test`
- `bun --cwd <impacted-target-path> run build`

# Failure Modes & Recovery

- Regression in RBAC/i18n/contracts: revert offending hunk and add targeted test.
- Multi-target breakage: run `bun run ci`, then bisect via turbo filters.

# Outputs

- Minimal patch set in impacted targets.
- Command logs for each gate.
