## 2025-05-xx - Bun Test Mock Leakage
**Issue:** `chat-viewer-bypass.security.test.ts` failed when running all tests due to leaked `mock.module` from other tests overriding `assertOrgPermission`.
**Learning:** Bun's `mock.module` can persist across test files when running in the same worker/context.
**Fix:** Explicitly mock the module in the affected test file to enforce desired behavior. Also, prefer mocking DB/lower layers over mocking shared guards where possible (as done in `orgs.security.test.ts`).

## 2025-05-xx - Node Version Mismatch and Unpinned Bun
**Issue:** Node version requirement `>=24.0.0` caused confusion and potential incompatibility. Bun version was unpinned (`latest`).
**Learning:** Always verify engine requirements against actual runtime capabilities. Pinning CI tools ensures reproducibility.
**Fix:** Adjusted Node engine to `>=18.18.0` and pinned Bun to `1.2.14`.
