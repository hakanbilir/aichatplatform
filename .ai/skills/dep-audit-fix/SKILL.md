# dep-audit-fix

## Goal
Remediate dependency vulnerabilities while minimizing break risk.

## Trigger
High/critical findings from dependency audit.

## Scope detection
- Start from `bun audit` output and affected direct dependencies.

## Steps (deterministic)
1. Run audit and capture high/critical entries.
2. Apply targeted dependency updates consistent with lockfile manager.
3. Re-run lint/typecheck/test/build for impacted packages.
4. Re-run audit to verify remediation.

## Guardrails
- Prefer patch/minor updates before major upgrades.
- Document residual accepted risk only if unavoidable.

## Acceptance checks (commands from Command Matrix)
- `bun run audit:deps`
- `bun run quality`
