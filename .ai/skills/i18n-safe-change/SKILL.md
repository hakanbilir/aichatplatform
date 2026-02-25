# i18n-safe-change

## Goal
Make localization-safe changes without regressions in fallback behavior.

## Trigger
Any UI/API text or translation resource updates.

## Scope detection
- Identify i18n libraries and locale resource files used by impacted targets.

## Steps (deterministic)
1. Reuse existing translation keys/namespaces patterns.
2. Add/modify locale entries consistently across required languages.
3. Keep default/fallback language behavior intact.
4. Validate rendering and lint/typecheck/tests for impacted target.

## Guardrails
- No hardcoded user-facing strings where i18n system is already used.
- Avoid deleting keys still referenced in code.

## Acceptance checks (commands from Command Matrix)
- `bun run --filter <workspace> lint`
- `bun run --filter <workspace> typecheck`
- `bun run --filter <workspace> test`
