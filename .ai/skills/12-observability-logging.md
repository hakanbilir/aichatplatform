# Name

12-observability-logging

# Goal

Keep telemetry and structured logging consistent when behavior changes.

# Trigger / When to Use

When adding endpoints, background jobs, or critical business operations.

# Scope Detection (Repo-Derived)

- `packages/telemetry/src/*`
- `apps/api-gateway/src/plugins/metrics.ts`
- `infra/monitoring/prometheus.yml`

# Inputs

- Changed execution paths.
- Required metrics/log fields.

# Procedure (Deterministic Steps)

1. Reuse existing logger/metrics abstraction from telemetry package.
2. Add metric increments/timers at route/job boundaries.
3. Ensure logs are structured and omit secrets/PII.
4. Update monitoring config only when metric names change.
5. Run lint/typecheck/build on affected targets.

# Guardrails

- No plaintext secret logging.
- Preserve metric name stability where dashboards depend on them.

# Acceptance Checks (Commands)

- `bun --cwd packages/telemetry run lint`
- `bun --cwd packages/telemetry run typecheck`
- `bun --cwd apps/api-gateway run build`

# Failure Modes & Recovery

- Missing metric registration: add default registration path and test.
- Dashboard break risk: emit both old/new metric names during migration window.

# Outputs

- Updated telemetry instrumentation and monitoring mappings.
