## 2025-05-xx - Bun Test Mock Leakage
**Issue:** `chat-viewer-bypass.security.test.ts` failed when running all tests due to leaked `mock.module` from other tests overriding `assertOrgPermission`.
**Learning:** Bun's `mock.module` can persist across test files when running in the same worker/context.
**Fix:** Explicitly mock the module in the affected test file to enforce desired behavior. Also, prefer mocking DB/lower layers over mocking shared guards where possible (as done in `orgs.security.test.ts`).
