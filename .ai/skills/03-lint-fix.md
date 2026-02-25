# Name

03-lint-fix

# Goal

Resolve ESLint failures with zero warning tolerance.

# Trigger / When to Use

When any lint gate fails locally or in CI.

# Scope Detection (Repo-Derived)

- Root lint orchestration: `package.json` script `lint`.
- Lint config: `.eslintrc.cjs`.
- Target scripts: each workspace `package.json` `lint` entry.

# Inputs

- Failing lint output.
- Impacted target(s).

# Procedure (Deterministic Steps)

1. Execute failing lint command for the target.
2. Apply deterministic autofixes where available.
3. Manually resolve unresolved violations.
4. Re-run target lint until clean.
5. Re-run root lint for parity if change spans multiple targets.

# Guardrails

- Do not disable rules globally to bypass errors.
- Keep import/order and TypeScript safety rules intact.

# Acceptance Checks (Commands)

- `bun --cwd <target> run lint`
- `bun run lint`

# Failure Modes & Recovery

- Parser/config errors: verify tsconfig paths and ESLint resolver settings.
- Rule conflict with generated code: isolate via ignore patterns only if already project-sanctioned.

# Outputs

- Lint-clean source files.
- Updated config only when strictly necessary.
