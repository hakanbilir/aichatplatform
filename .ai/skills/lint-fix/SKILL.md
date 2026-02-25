# lint-fix

## Goal
Resolve lint failures with minimal production-safe changes.

## Trigger
Any lint failure in root CI or target package checks.

## Scope detection
- Use failing paths from lint output.
- Limit edits to impacted package(s).

## Steps (deterministic)
1. Reproduce with package-level lint command.
2. Apply the smallest fix that matches existing style and architecture.
3. Re-run package lint, then root lint for impacted graph.

## Guardrails
- No disabling lint rules unless already established and justified.
- Preserve behavior and API contracts.

## Acceptance checks (commands from Command Matrix)
- `bun run --filter <workspace> lint`
- `bun run lint`
