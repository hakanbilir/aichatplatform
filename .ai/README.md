# AI Skill Library + Workflow Orchestration

This folder makes AI-assisted coding deterministic for this monorepo by anchoring every gate command to repository facts discovered from:

- Root/workspace `package.json` scripts
- `.github/workflows/ci.yml`
- `turbo.json` and core lint/type/format configs

## What is in `/.ai/`

- `repo-facts.json`: machine-readable topology, target types, scripts, CI gates.
- `command-matrix.md`: human-readable lint/type/test/build matrix.
- `skills/*.md`: deterministic operational skills with guardrails and acceptance checks.
- `workflows/*.yml`: orchestration recipes that chain skills with stop conditions.

## Manual Workflow Usage

1. **Refresh intake facts**
   - Re-read source-of-truth files.
   - Regenerate `repo-facts.json` and `command-matrix.md`.
2. **Select workflow** based on task:
   - Quality repair: `workflows/autofix-quality.yml`
   - Feature delivery: `workflows/feature-implementation.yml`
   - Release decision: `workflows/release-readiness.yml`
3. **Execute each step in order**, running the exact acceptance commands listed in each referenced skill.
4. **Do not finish** if a workflow gate fails; follow the skill recovery section and re-run gates.

## Required Commands and Provenance

Authoritative CI-parity sequence (from `.github/workflows/ci.yml`):

1. `bun install`
2. `bun run format:check`
3. `bun run db:generate`
4. `bun run ci`

Root quality commands (from root `package.json`):

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun run audit:deps`

Per-target commands are listed in `command-matrix.md` and copied from each target `package.json`.

## 3 Example Runs

### 1) Intake + command matrix refresh

1. Apply skill `00-repo-intake`.
2. Apply skill `01-command-discovery`.
3. Confirm outputs:
   - `/.ai/repo-facts.json`
   - `/.ai/command-matrix.md`

### 2) Autofix quality on one target (`apps/api-gateway`)

1. Run workflow `workflows/autofix-quality.yml`.
2. Restrict fixes to target path `apps/api-gateway`.
3. Execute acceptance gates:
   - `bun --cwd apps/api-gateway run lint`
   - `bun --cwd apps/api-gateway run typecheck`
   - `bun --cwd apps/api-gateway run test`
   - `bun --cwd apps/api-gateway run build`
4. Finish with root parity checks when shared packages are touched:
   - `bun run ci`

### 3) Feature implementation end-to-end

1. Start `workflows/feature-implementation.yml`.
2. Intake and command discovery first.
3. Use `02-safe-editing-protocol` for minimal edits.
4. Conditionally run:
   - `09-i18n-safe-change`
   - `10-rbac-safe-change`
   - `11-api-contract-safe-change`
5. Complete with `13-ci-parity-check`.

## Adding a New Skill

1. Create `/.ai/skills/<NN>-<name>.md`.
2. Include required sections exactly:
   - Name
   - Goal
   - Trigger / When to Use
   - Scope Detection (Repo-Derived)
   - Inputs
   - Procedure (Deterministic Steps)
   - Guardrails
   - Acceptance Checks (Commands)
   - Failure Modes & Recovery
   - Outputs
3. Reference only commands present in `repo-facts.json` / command matrix / CI.
4. If applicable, add the new skill into one or more workflow specs under `/.ai/workflows/`.

## Updating Repo Facts When Tooling Changes

Trigger update when any of these change:

- Root/workspace `package.json`
- `.github/workflows/*`
- `turbo.json`
- lint/type/format configs
- lockfile (`bun.lock`)

Then re-run intake + command discovery and commit regenerated `repo-facts.json` + `command-matrix.md`.

## Troubleshooting

- **Bun cache/store issues**: run `bun install --force` and retry gates.
- **Prisma generation fails**: verify `DATABASE_URL` and run `bun run db:generate`.
- **Next build env errors**: ensure required vars are present in `.env.example` and runtime env.
- **Pods/Gradle cache**: currently not applicable (no React Native signals detected). If RN is added, extend repo facts first.
