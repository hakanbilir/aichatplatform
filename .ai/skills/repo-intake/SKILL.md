# repo-intake

## Goal

Create a reliable repository map and command matrix before planning or editing.

## Trigger

Run at the start of any autonomous task.

## Scope detection

1. Read root `package.json`, lockfile, workspace config files, and `.github/workflows/*`.
2. Read each workspace `package.json` in `apps/*` and `packages/*`.
3. Detect framework/service types from files and scripts (Next.js, Vite, API service, worker, React Native).

## Steps (deterministic)

1. Identify package manager, workspace manager, and orchestration tool.
2. Enumerate apps/packages with role labels (frontend app, backend service, shared library, infra package).
3. Build a command matrix with exact scripts for `lint`, `typecheck`, `test`, `build`, `dev`, and `start` when present.
4. Extract CI commands and required environment assumptions.
5. Define quality gates from CI and workspace scripts.

## Guardrails

- Do not guess commands that are not present in scripts/CI.
- Keep map concise and accurate.
- Call out missing scripts explicitly.

## Acceptance checks (commands from Command Matrix)

- `bun run format:check`
- `bun run ci`
- Optional target-only checks using `bun run --filter <workspace> <script>` when narrowing scope.
