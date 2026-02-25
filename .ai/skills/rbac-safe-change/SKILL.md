# rbac-safe-change

## Goal
Implement authorization-related changes without widening access unintentionally.

## Trigger
Any changes touching roles, permissions, guards, or policy evaluation.

## Scope detection
- Search for role/permission policy modules and guard middleware in impacted apps/services.

## Steps (deterministic)
1. Identify existing RBAC flow (token/session claims, guard, policy, enforcement points).
2. Apply minimal, explicit policy changes.
3. Validate deny-by-default behavior and role scoping.
4. Add/update tests where RBAC tests exist.

## Guardrails
- Never bypass authorization checks for convenience.
- Preserve API contract shape for auth responses.

## Acceptance checks (commands from Command Matrix)
- `bun run --filter <workspace> test`
- `bun run --filter <workspace> lint`
- `bun run --filter <workspace> typecheck`
