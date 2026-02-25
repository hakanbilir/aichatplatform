# Name

11-api-contract-safe-change

# Goal

Change API behavior while preserving consumer contracts and schema alignment.

# Trigger / When to Use

When editing request/response shapes, route schemas, shared types, or DB schema.

# Scope Detection (Repo-Derived)

- `apps/api-gateway/src/routes/*`
- `packages/core-types/src/*`
- `packages/db/prisma/schema.prisma`

# Inputs

- Contract change requirements.
- Impacted clients and shared types.

# Procedure (Deterministic Steps)

1. Locate contract source (route schema, Zod type, shared interface, Prisma model).
2. Implement backward-compatible change first (optional fields/versioned path where needed).
3. Update shared types and runtime validation together.
4. Update API tests for request/response contracts.
5. Regenerate Prisma client if schema changed.
6. Run lint/type/test/build on impacted targets plus root CI.

# Guardrails

- No silent breaking response shape changes.
- Keep runtime validation aligned with TypeScript types.

# Acceptance Checks (Commands)

- `bun run db:generate` (if Prisma schema changed)
- `bun --cwd apps/api-gateway run test`
- `bun run ci`

# Failure Modes & Recovery

- Consumer break detected: add compatibility shim and deprecate old field/path.
- Prisma drift: regenerate client and re-run typecheck/build.

# Outputs

- Updated contracts, runtime validators, and compatibility notes.
