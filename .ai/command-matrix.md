# AI Command Matrix (Derived from Source-of-Truth)

All commands in this matrix are derived from workspace `package.json` scripts, root scripts, and `.github/workflows/ci.yml`.

## Global / CI-Parity Commands

| Gate                       | Canonical command      | Source                     |
| -------------------------- | ---------------------- | -------------------------- |
| Install                    | `bun install`          | `.github/workflows/ci.yml` |
| Format check               | `bun run format:check` | root `package.json`, CI    |
| Prisma client generation   | `bun run db:generate`  | root `package.json`, CI    |
| Lint (all workspaces)      | `bun run lint`         | root `package.json`        |
| Typecheck (all workspaces) | `bun run typecheck`    | root `package.json`        |
| Test (all workspaces)      | `bun run test`         | root `package.json`        |
| Build (all workspaces)     | `bun run build`        | root `package.json`        |
| CI aggregate               | `bun run ci`           | root `package.json`, CI    |
| Dependency audit           | `bun run audit:deps`   | root `package.json`        |

## Target Command Matrix

| Target                       | Type               | Lint                                            | Typecheck                                            | Test                                            | Build                                            | Start/Dev                                 |
| ---------------------------- | ------------------ | ----------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| `apps/api-gateway`           | Node + Fastify API | `bun --cwd apps/api-gateway run lint`           | `bun --cwd apps/api-gateway run typecheck`           | `bun --cwd apps/api-gateway run test`           | `bun --cwd apps/api-gateway run build`           | `bun --cwd apps/api-gateway run dev`      |
| `apps/web`                   | React + Vite       | `bun --cwd apps/web run lint`                   | `bun --cwd apps/web run typecheck`                   | `bun --cwd apps/web run test`                   | `bun --cwd apps/web run build`                   | `bun --cwd apps/web run dev`              |
| `apps/web-app`               | Next.js 15         | `bun --cwd apps/web-app run lint`               | `bun --cwd apps/web-app run typecheck`               | `bun --cwd apps/web-app run test`               | `bun --cwd apps/web-app run build`               | `bun --cwd apps/web-app run dev`          |
| `apps/worker-jobs`           | Node worker        | `bun --cwd apps/worker-jobs run lint`           | `bun --cwd apps/worker-jobs run typecheck`           | `bun --cwd apps/worker-jobs run test`           | `bun --cwd apps/worker-jobs run build`           | `bun --cwd apps/worker-jobs run dev`      |
| `packages/chat-orchestrator` | TS lib             | `bun --cwd packages/chat-orchestrator run lint` | `bun --cwd packages/chat-orchestrator run typecheck` | `bun --cwd packages/chat-orchestrator run test` | `bun --cwd packages/chat-orchestrator run build` | n/a                                       |
| `packages/config`            | TS lib             | `bun --cwd packages/config run lint`            | `bun --cwd packages/config run typecheck`            | `bun --cwd packages/config run test`            | `bun --cwd packages/config run build`            | n/a                                       |
| `packages/core-types`        | TS lib             | `bun --cwd packages/core-types run lint`        | `bun --cwd packages/core-types run typecheck`        | `bun --cwd packages/core-types run test`        | `bun --cwd packages/core-types run build`        | n/a                                       |
| `packages/db`                | TS lib + Prisma    | `bun --cwd packages/db run lint`                | `bun --cwd packages/db run typecheck`                | `bun --cwd packages/db run test`                | `bun --cwd packages/db run build`                | `bun --cwd packages/db run prisma:studio` |
| `packages/ollama-client`     | TS lib             | `bun --cwd packages/ollama-client run lint`     | `bun --cwd packages/ollama-client run typecheck`     | `bun --cwd packages/ollama-client run test`     | `bun --cwd packages/ollama-client run build`     | n/a                                       |
| `packages/telemetry`         | TS lib             | `bun --cwd packages/telemetry run lint`         | `bun --cwd packages/telemetry run typecheck`         | `bun --cwd packages/telemetry run test`         | `bun --cwd packages/telemetry run build`         | n/a                                       |
| `packages/tools-engine`      | TS lib             | `bun --cwd packages/tools-engine run lint`      | `bun --cwd packages/tools-engine run typecheck`      | `bun --cwd packages/tools-engine run test`      | `bun --cwd packages/tools-engine run build`      | n/a                                       |

## Turbo Scoped Equivalents

Use when batching by dependency graph:

- `bunx turbo run lint --filter=<target>`
- `bunx turbo run typecheck --filter=<target>`
- `bunx turbo run test --filter=<target>`
- `bunx turbo run build --filter=<target>`

## Notes

- Several targets intentionally use placeholder test scripts (`echo "no tests yet"`). This is current repo truth and must not be silently replaced without adding real tests.
- React Native-specific build commands are not available in this repository (no `ios/`, `android/`, `metro.config.*`, or RN dependencies detected).
