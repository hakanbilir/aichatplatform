# Name

14-performance-smoke

# Goal

Run lightweight performance sanity checks after significant code-path changes.

# Trigger / When to Use

When changing hot paths in API routes, chat orchestration, or frontend rendering loops.

# Scope Detection (Repo-Derived)

- API request handlers: `apps/api-gateway/src/routes/*`
- Orchestration logic: `packages/chat-orchestrator/src/*`
- Frontend rendering surfaces: `apps/web/src/*`, `apps/web-app/*`

# Inputs

- Changed files.
- Existing test scripts and profiling hooks.

# Procedure (Deterministic Steps)

1. Build impacted targets to ensure optimized output compiles.
2. Run existing target tests that cover changed path.
3. Compare before/after latency or response-size metrics where available.
4. Record smoke results in workflow summary.

# Guardrails

- No synthetic benchmark tools unless already present in repo.
- Treat obvious regressions as release blockers.

# Acceptance Checks (Commands)

- `bun --cwd apps/api-gateway run build`
- `bun --cwd packages/chat-orchestrator run build`
- `bun --cwd apps/web run build`

# Failure Modes & Recovery

- No benchmark harness: use request timing logs from existing telemetry hooks.
- Build passes but runtime slows: identify changed algorithm and optimize before merge.

# Outputs

- Performance smoke checklist and observed metrics delta.
