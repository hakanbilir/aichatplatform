# typecheck-fix

## Goal

Restore TypeScript correctness without weakening types.

## Trigger

Any `tsc --noEmit` or typecheck pipeline failure.

## Scope detection

- Use compiler errors to locate failing package(s).

## Steps (deterministic)

1. Reproduce with package `typecheck` script.
2. Prefer reusing existing shared types/utilities.
3. Fix source types, narrow unknowns safely, and maintain runtime parity.
4. Re-run package typecheck and impacted root checks.

## Guardrails

- Avoid `any` unless already required by local patterns.
- No suppression comments unless unavoidable and documented.

## Acceptance checks (commands from Command Matrix)

- `bun run --filter <workspace> typecheck`
- `bun run typecheck`
