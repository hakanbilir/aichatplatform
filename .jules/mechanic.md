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

## 2026-03-10 - Turborepo Test Output Warnings

**Issue:** Turborepo emitted "no output files found for task" warnings during CI pipelines for the `test` task.
**Learning:** The `test` task was configured with `outputs: ["coverage/**"]`, but not all packages generate coverage by default.
**Fix:** Updated the `test` task in `turbo.json` to `outputs: []` to prevent Turborepo from expecting missing output files.

## 2026-03-17 - Monolithic CI Step Obscured Errors and Bypassed Lint Flags

**Issue:** The monolithic `bun run ci` step in `ci.yml` invoked `turbo run lint ...`, bypassing the `--max-warnings=0` flag defined in the root `package.json`'s `lint` script. It also grouped all output into a single step, harming CI observability.
**Learning:** Avoid monolithic CI script wrappers in GitHub Actions. Splitting them into distinct steps leverages the CI platform's native observability and ensures root-level script wrappers (like `bun run lint` which adds necessary strictness flags) are explicitly invoked.
**Fix:** Split `bun run ci` into distinct `Lint`, `Typecheck`, `Test`, and `Build` steps in `ci.yml`. Also ensured `actions/setup-node@v4` is used across workflows to stabilize Node environments.

## 2026-03-18 - Missing Root File Linting and API Gateway Test Directory

**Issue:** Root files like scripts were not linted because Turborepo `lint` targets only scoped packages/apps. Additionally, API gateway security tests located in `./test` were completely skipped because `bun test ./src` ignored them to avoid `dist`.
**Learning:** Always explicitly include root-level lint commands in CI. When using explicitly scoped directories in test scripts (like `./src`) to avoid building outputs, verify no other test directories (like `./test`) are inadvertently skipped.
**Fix:** Added an explicit `Lint Root` step in `ci.yml` using `bun x eslint .`. Fixed `apps/api-gateway/package.json` test script to include both directories with `bun test --dir ./src --dir ./test`.

## 2026-03-20 - Redundant Workflow Executions

**Issue:** Separate workflows for fast isolated checks (like `docs-devfollowme.yml`) waste CI minutes by duplicating environment setup.
**Learning:** Consolidating fast isolated checks into the main CI workflow prevents redundant environment setup and saves CI minutes.
**Fix:** Moved the `Check DeveloperFollowMe drift` step into `ci.yml` and deleted the redundant `docs-devfollowme.yml` workflow.

## 2026-03-30 - Missing Environment Variables for CI Tests

**Issue:** API gateway tests failed in CI due to missing environment variables (`REDIS_URL`, `JWT_SECRET`), causing `loadConfig` validation to fail during `bun run test`.
**Learning:** CI workflows running tests that require environment configuration must explicitly provide them, even if they are mocked within the tests, because configuration validation often runs at module initialization time before mocks are applied.
**Fix:** Added the missing environment variables to the `env` block of the `build-and-test` job in `.github/workflows/ci.yml`.

## 2026-04-12 - Node.js Engine Mismatch in CI Workflows

**Issue:** The project's `package.json` enforced a strict `"engines": { "node": ">=24.0.0" }` requirement, but the GitHub Actions workflows (`ci.yml`, `security.yml`) were still using `node-version: 20` in the `actions/setup-node@v4` step.
**Learning:** A mismatch between the project's required Node engine and the CI runner's node version can cause dependency installation or script execution failures, leading to deprecated/mismatched node version issues. CI environments must explicitly match the project's strict engine requirements.
**Fix:** Updated `node-version` from `20` to `24` in all relevant workflow files to ensure compatibility with the project's engine requirements.

## 2026-05-18 - Bun Test Mock Leakage and Missing Exports

**Issue:** `SyntaxError: Export named 'getUserOrgRole' not found in module '/app/apps/api-gateway/src/rbac/guards.ts'` and `cleanupExpiredTokens not found in '@ai-chat/db'` failed CI build `bun run test` entirely. The tests passed in isolation but failed globally.
**Learning:** Bun's `mock.module` replaces the real module with the mocked one globally for the context. If a test file partially mocks a module's exports (e.g. only `getUserOrgRole` instead of all imported exports), other tests needing the omitted exports will fail. This is the root cause of the "Bun Test Mock Leakage" failures.
**Fix:** Always define explicitly all the utilized module exports when using `mock.module`, to prevent leakage and missing export errors during parallel test suite runs.
