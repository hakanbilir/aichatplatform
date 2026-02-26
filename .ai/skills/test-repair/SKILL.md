# test-repair

## Goal

Make failing tests pass while preserving intended behavior.

## Trigger

Any failing unit/integration tests.

## Scope detection

- Start from failing test files and dependent modules.

## Steps (deterministic)

1. Reproduce the failing tests at package scope.
2. Fix production code first when behavior is wrong.
3. Update tests only when assertions conflict with intended behavior.
4. Re-run package and impacted root tests.

## Guardrails

- Do not delete meaningful test coverage to force pass.
- Keep fixtures deterministic.

## Acceptance checks (commands from Command Matrix)

- `bun run --filter <workspace> test`
- `bun run test`
