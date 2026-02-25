# Name

00-repo-intake

# Goal

Produce deterministic repository facts before any planning or editing.

# Trigger / When to Use

Use at the start of every automation run and whenever tooling/layout changes.

# Scope Detection (Repo-Derived)

- Root markers: `package.json`, `bun.lock`, `turbo.json`, `.github/workflows/ci.yml`.
- Workspace markers: `apps/*/package.json`, `packages/*/package.json`.

# Inputs

- Repository root path.
- Existing `/.ai/repo-facts.json` (if present).

# Procedure (Deterministic Steps)

1. Read root `package.json`, `turbo.json`, `.eslintrc.cjs`, `.prettierrc`, `tsconfig.base.json`.
2. Enumerate workspace package manifests in `apps/*` and `packages/*`.
3. Parse script commands per workspace target.
4. Read CI workflow `.github/workflows/ci.yml` and extract job step commands.
5. Detect framework signals (Next.js, Fastify/Node API, Vite React, Prisma, monitoring).
6. Write `/.ai/repo-facts.json` with topology, command catalog, targets, and safety signals.
7. Write `/.ai/command-matrix.md` from the facts.

# Guardrails

- Do not infer commands that are absent from scripts/CI.
- Preserve exact script command strings.
- Do not edit application code in intake.

# Acceptance Checks (Commands)

- `bun run format:check`
- `bun run ci` (only for full parity runs, not required for docs-only regeneration)

# Failure Modes & Recovery

- Missing manifest: fail intake and list missing file path.
- Invalid JSON/YAML parsing: rerun with strict parser and capture offending file.
- Command mismatch against CI: prioritize CI command sequence.

# Outputs

- `/.ai/repo-facts.json`
- `/.ai/command-matrix.md`
- Intake summary for workflow logs.
