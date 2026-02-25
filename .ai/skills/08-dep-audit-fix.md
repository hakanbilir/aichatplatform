# Name

08-dep-audit-fix

# Goal

Identify and remediate vulnerable dependencies using repository-native tooling.

# Trigger / When to Use

When dependency audit is requested or after dependency upgrades.

# Scope Detection (Repo-Derived)

- Root script `audit:deps` in `package.json`.
- Lockfile `bun.lock`.

# Inputs

- Current lockfile and manifest set.
- Audit output.

# Procedure (Deterministic Steps)

1. Run `bun run audit:deps`.
2. Classify findings by severity and reachable exploit path.
3. Apply minimal safe upgrades in affected manifest(s).
4. Run install and regenerate lockfile.
5. Run lint/type/test/build gates for impacted targets.

# Guardrails

- Avoid broad major upgrades unless vulnerability cannot be mitigated otherwise.
- Keep compatibility with Node/Bun engine requirements.

# Acceptance Checks (Commands)

- `bun run audit:deps`
- `bun run ci`

# Failure Modes & Recovery

- No patched version available: document risk acceptance window and compensating controls.
- Upgrade breaks build: pin to lowest secure compatible version and retest.

# Outputs

- Updated dependency versions and lockfile.
- Audit remediation summary.
