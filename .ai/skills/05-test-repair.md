# Name

05-test-repair

# Goal

Restore deterministic passing tests for impacted targets.

# Trigger / When to Use

When `test` scripts fail or when behavior changes require test updates.

# Scope Detection (Repo-Derived)

- API tests: `apps/api-gateway/test/*.test.ts`
- Target scripts `test` from each workspace manifest.

# Inputs

- Failing test logs.
- Changed behavior and expected outcomes.

# Procedure (Deterministic Steps)

1. Run target test command.
2. Reproduce with narrowed test file when possible.
3. Fix production code or assertion to align with intended contract.
4. Re-run target tests.
5. Run `bun run test` if shared logic changed.

# Guardrails

- Do not delete tests to obtain green status.
- Preserve security and authorization test intent.

# Acceptance Checks (Commands)

- `bun --cwd apps/api-gateway run test`
- `bun run test`

# Failure Modes & Recovery

- Flaky tests: stabilize by removing timing/network nondeterminism in tests.
- Placeholder test scripts in some targets: record as non-blocking informational gate.

# Outputs

- Passing tests for affected suites.
- Updated test fixtures/mocks where needed.
