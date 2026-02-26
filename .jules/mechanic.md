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
