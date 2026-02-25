# Name

09-i18n-safe-change

# Goal

Implement text/content changes without breaking localization behavior.

# Trigger / When to Use

When editing user-visible strings or translation key usage.

# Scope Detection (Repo-Derived)

- `apps/web/src/i18n/locales/*`
- `apps/api-gateway/src/i18n/locales/*`
- i18n usage via `i18next` in app code.

# Inputs

- Target locale keys and updated content.
- Affected UI/API files.

# Procedure (Deterministic Steps)

1. Identify existing translation key namespace.
2. Add/update key-value pairs in locale files.
3. Update call sites to reuse existing key patterns.
4. Ensure fallback locale includes new keys.
5. Run lint/type/test/build for affected target(s).

# Guardrails

- No hardcoded user-facing strings in place of localized keys when i18n exists.
- No key deletion without migration across locales.

# Acceptance Checks (Commands)

- `bun --cwd apps/web run lint`
- `bun --cwd apps/web run typecheck`
- `bun --cwd apps/api-gateway run lint`
- `bun --cwd apps/api-gateway run test`

# Failure Modes & Recovery

- Missing key runtime errors: add missing key to all active locale files.
- Namespace collisions: prefix key under feature namespace.

# Outputs

- Updated locale assets and i18n call sites.
