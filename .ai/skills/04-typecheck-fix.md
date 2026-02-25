# Name

04-typecheck-fix

# Goal

Eliminate TypeScript type errors without weakening strictness.

# Trigger / When to Use

When `typecheck` fails for any target or root.

# Scope Detection (Repo-Derived)

- `tsconfig.base.json`
- Target-level `tsconfig.json`
- `package.json` scripts `typecheck`

# Inputs

- TypeScript compiler diagnostics.
- Impacted modules and shared types.

# Procedure (Deterministic Steps)

1. Run `bun --cwd <target> run typecheck`.
2. Fix root-cause types first in shared packages (`core-types`, `db`, `config`) when applicable.
3. Update downstream usage sites.
4. Re-run target typecheck.
5. Run `bun run typecheck` for cross-workspace parity.

# Guardrails

- Do not use `any` unless already contractually required.
- Do not disable strict compiler options.

# Acceptance Checks (Commands)

- `bun --cwd <target> run typecheck`
- `bun run typecheck`

# Failure Modes & Recovery

- Cascading failures after shared type edits: rebuild dependent packages with turbo filters.
- Generated Prisma type drift: run `bun run db:generate` then re-check.

# Outputs

- Type-safe code and updated shared type definitions if needed.
