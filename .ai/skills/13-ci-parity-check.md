# Name

13-ci-parity-check

# Goal

Verify local changes satisfy the same gates enforced in GitHub CI.

# Trigger / When to Use

Before finalizing any non-doc patch.

# Scope Detection (Repo-Derived)

- `.github/workflows/ci.yml` build-and-test job.
- Root scripts: `format:check`, `db:generate`, `ci`.

# Inputs

- Current branch diff.
- CI workflow definition.

# Procedure (Deterministic Steps)

1. Run `bun install` if lockfile/manifests changed.
2. Run `bun run format:check`.
3. Run `bun run db:generate`.
4. Run `bun run ci`.
5. Capture command outcomes for summary.

# Guardrails

- Do not skip failing gate unless environment limitation is explicit and documented.
- Maintain parity with CI command order.

# Acceptance Checks (Commands)

- `bun run format:check`
- `bun run db:generate`
- `bun run ci`

# Failure Modes & Recovery

- Local-only pass but CI fail: compare env and cache-sensitive steps, then rerun clean.
- DB URL missing for generate/test paths: use repository-documented local env defaults.

# Outputs

- CI parity execution report with pass/fail per gate.
