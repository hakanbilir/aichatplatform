# Repo Map + Workflow Profile

## Repo Map

- **Monorepo:** Bun workspaces + Turborepo (`apps/*`, `packages/*`).
- **Apps:**
  - `apps/api-gateway` (Fastify + TypeScript)
  - `apps/web` (Vite + React + TypeScript)
  - `apps/web-app` (Next.js + React + TypeScript)
  - `apps/worker-jobs` (TypeScript worker)
- **Packages:**
  - shared TS libraries under `packages/*` (`config`, `core-types`, `db`, `chat-orchestrator`, `ollama-client`, `telemetry`, `tools-engine`)
- **Languages/Runtimes:** TypeScript/JavaScript, Bun package/runtime, Node runtime constraints in package manifests.

## Toolchain Discovery

- **Package manager:** Bun (`packageManager: bun@1.2.14`, `bun.lock` present)
- **Monorepo orchestration:** Turborepo (`turbo.json`)
- **Lint/format:** ESLint + Prettier
- **Type checks:** `tsc --noEmit` per workspace + `turbo run typecheck`
- **Tests:** Bun test in `api-gateway`; placeholder tests in many packages/apps via script stubs
- **Build:** `turbo run build`, using `tsc`, `vite build`, `next build`
- **CI:** GitHub Actions (`.github/workflows/ci.yml`)

## Workflow Entrypoints

- **Root scripts (`package.json`):**
  - install: `bun install --frozen-lockfile`
  - lint: `bun run lint`
  - typecheck: `bun run typecheck`
  - test: `bun run test`
  - build: `bun run build`
  - quality (golden): `bun run quality`
  - ai repair loop: `bun run repair:ai`
  - security: `bun run security`
- **Orchestration config:** `turbo.json`
- **CI:** `.github/workflows/ci.yml`, `.github/workflows/security.yml`
- **Shell helpers:** `scripts/quality-gates.sh`, `scripts/ai-repair-loop.sh`, plus `scripts/pm2/*`

## Workflow Profile

- **Lint:** `bun run lint`
- **Typecheck:** `bun run typecheck`
- **Test:** `bun run test`
- **Build:** `bun run build`
- **Security:** `bun run security` + GitHub `security` workflow
- **Release:** documented process in `docs/ai/RELEASE.md`
- **Golden command (deterministic):** `bun run quality`
