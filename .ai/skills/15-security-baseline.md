# Name

15-security-baseline

# Goal

Enforce baseline application security checks for every substantial change.

# Trigger / When to Use

Use for API/auth/data-path changes and before release readiness.

# Scope Detection (Repo-Derived)

- Security-sensitive tests: `apps/api-gateway/test/*security*.test.ts`
- Auth/RBAC code: `apps/api-gateway/src/plugins/*`, `apps/api-gateway/src/rbac/*`
- Dependency audit command: root `audit:deps` script.

# Inputs

- Branch diff.
- Current dependency lockfile.

# Procedure (Deterministic Steps)

1. Run API security-focused tests via `bun --cwd apps/api-gateway run test`.
2. Run repository dependency audit.
3. Verify no new secrets introduced in source/config files.
4. Run CI parity checks.

# Guardrails

- Do not weaken auth guards or token validation paths.
- Do not merge known high/critical unresolved dependency vulnerabilities without explicit exception.

# Acceptance Checks (Commands)

- `bun --cwd apps/api-gateway run test`
- `bun run audit:deps`
- `bun run ci`

# Failure Modes & Recovery

- Security test regressions: rollback change and create minimal secure fix.
- Audit findings without patch: isolate vulnerable dependency path and apply compensating controls.

# Outputs

- Security baseline report and remediated code/dependencies.
