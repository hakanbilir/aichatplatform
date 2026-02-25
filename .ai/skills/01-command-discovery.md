# Name

01-command-discovery

# Goal

Build authoritative lint/type/test/build command mappings for each target.

# Trigger / When to Use

Use after intake and whenever scripts/CI files change.

# Scope Detection (Repo-Derived)

- `package.json` at root and all workspaces.
- `.github/workflows/ci.yml` CI gate commands.
- `turbo.json` for orchestration patterns.

# Inputs

- `/.ai/repo-facts.json` (if existing).
- Current manifest and CI files.

# Procedure (Deterministic Steps)

1. Extract root scripts from `package.json`.
2. Extract workspace scripts from each `apps/*/package.json` and `packages/*/package.json`.
3. Cross-check gates used by `.github/workflows/ci.yml`.
4. Resolve per-target execution form: `bun --cwd <path> run <script>`.
5. Regenerate `/.ai/command-matrix.md`.
6. Update `commandCatalog` and `targets[*].scripts` in `/.ai/repo-facts.json`.

# Guardrails

- Do not fabricate missing scripts.
- Flag placeholder scripts (like `echo "no tests yet"`) as-is.

# Acceptance Checks (Commands)

- `bun run format:check`
- `bun run ci`

# Failure Modes & Recovery

- Script missing for a gate: mark target gate as unavailable and log remediation proposal.
- CI contains custom shell commands not in scripts: capture them verbatim in `repo-facts.json`.

# Outputs

- Updated `/.ai/repo-facts.json`
- Updated `/.ai/command-matrix.md`
