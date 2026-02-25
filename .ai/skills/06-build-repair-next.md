# Name

06-build-repair-next

# Goal

Repair Next.js build failures for `apps/web-app`.

# Trigger / When to Use

When `apps/web-app` build or CI build step fails.

# Scope Detection (Repo-Derived)

- `apps/web-app/next.config.mjs`
- `apps/web-app/package.json` with `next` scripts.
- CI cache target `apps/web-app/.next/cache` in `.github/workflows/ci.yml`.

# Inputs

- Next build output.
- Changed files in `apps/web-app`.

# Procedure (Deterministic Steps)

1. Run `bun --cwd apps/web-app run build`.
2. Fix route/component/type issues reported by Next/TS.
3. Verify lint and typecheck for `apps/web-app`.
4. Re-run Next build.
5. Run root `bun run build` if shared packages changed.

# Guardrails

- Do not disable production build checks.
- Preserve SSR/route behavior and existing env variable contracts.

# Acceptance Checks (Commands)

- `bun --cwd apps/web-app run lint`
- `bun --cwd apps/web-app run typecheck`
- `bun --cwd apps/web-app run build`

# Failure Modes & Recovery

- Missing env variables in build: validate `.env.example` contract before adding new variables.
- Shared package regression: build upstream package first with turbo filters.

# Outputs

- Buildable Next.js app and updated dependent code.
