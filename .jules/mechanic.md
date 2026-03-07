## 2025-05-xx - Bun Test Mock Leakage

**Issue:** `chat-viewer-bypass.security.test.ts` failed when running all tests due to leaked `mock.module` from other tests overriding `assertOrgPermission`.
**Learning:** Bun's `mock.module` can persist across test files when running in the same worker/context.
**Fix:** Explicitly mock the module in the affected test file to enforce desired behavior. Also, prefer mocking DB/lower layers over mocking shared guards where possible (as done in `orgs.security.test.ts`).

## 2025-05-xx - Node Version Mismatch and Unpinned Bun

**Issue:** Node version requirement `>=24.0.0` caused confusion and potential incompatibility. Bun version was unpinned (`latest`).
**Learning:** Always verify engine requirements against actual runtime capabilities. Pinning CI tools ensures reproducibility.
**Fix:** Adjusted Node engine to `>=18.18.0` and pinned Bun to `1.2.14`.

## 2025-05-xx - Next.js Cache Invalidation

**Issue:** `actions/cache` key for Next.js used restrictive file extensions (`.js`, `.jsx`, `.ts`, `.tsx`), causing cache to persist (and not update) when CSS or asset files changed.
**Learning:** `hashFiles` needs to be inclusive of all source files (`**/*`) to ensure correct cache invalidation and saving of new build artifacts.
**Fix:** Updated glob pattern to `apps/web-app/src/**/*` and `apps/web-app/app/**/*`.

## 2025-06-xx - Missing Typecheck in CI and Monorepo Test Leaks

**Issue:** `apps/web` (Vite) was not being type-checked in CI, allowing type errors to merge. Enabling type-check revealed existing type errors in `apps/api-gateway` and `apps/worker-jobs`. Also, `bun test src` in `api-gateway` was picking up compiled tests in `dist`, causing duplicate/failing runs.
**Learning:** Vite build skips `tsc` by default. Monorepos using `tsc` to build into `dist` need explicit exclusion of `dist` in test scripts if using globbing or broad patterns.
**Fix:** Added `typecheck` to `ci` script. Fixed strict type errors in `api-gateway`/`worker-jobs`. Updated `api-gateway` test script to `bun test ./src` to ignore `dist`.

## 2025-07-xx - Turborepo v2 Cache Path Mismatch and Mixed Package Managers

**Issue:** The CI cache step for Turborepo used an outdated path (`node_modules/.cache/turbo`), failing to cache built artifacts since Turborepo v2 puts them in `.turbo/cache`. Also, `.github/workflows/docs-devfollowme.yml` and `package.json` had mixed usage of `npm run` and `bun run`, causing drift checks to be less optimal and triggering `npm notice` updates.
**Learning:** Always verify cache paths match the tool version. Turborepo >= v2 caches to `.turbo/cache`. Ensuring consistent package manager usage prevents unexpected environments and warnings.
**Fix:** Updated `path: node_modules/.cache/turbo` to `path: .turbo/cache` in `ci.yml`. Swapped `npm run` to `bun run` in `docs-devfollowme.yml` and `package.json` for consistency.

## 2025-10-xx - Missing actions/checkout for Dependency Review and Gitleaks fetch-depth

**Issue:** `actions/dependency-review-action` failed because it lacked a preceding `actions/checkout` step. Additionally, `gitleaks-action` was not correctly scanning the repository history without a full git history fetch.
**Learning:** Dependency review tools need access to the repository to inspect manifest files. Security scanners that analyze history (like `gitleaks`) require the `fetch-depth: 0` argument for the checkout step.
**Fix:** Added `actions/checkout@v4` prior to the `dependency-review-action` step. Configured `fetch-depth: 0` for the `actions/checkout@v4` step in the job that runs `gitleaks-action`.

## 2026-03-07 - Impossible Node Engine Constraint Breaks Dependencies

**Issue:** An overly strict engine requirement (`>=24.0.0`) in `apps/api-gateway/package.json` breaks dependency installation on standard CI runners. Node.js 24 is not an active LTS yet, so standard GitHub Action runners might not have it.
**Learning:** Hardcoding a strict upper limit or future unreleased engine version in `package.json`'s `engines` field can cause `pnpm`/`bun` installs to fail unexpectedly on CI if the environment is not matched perfectly.
**Fix:** Adjusted the Node engine constraint to the more reasonable and safe `>=18.18.0`.
