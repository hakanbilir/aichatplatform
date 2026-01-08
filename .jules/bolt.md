## 2025-01-29 - Critical Learning: Missing Tests and Broken Linting in `apps/web`
**Learning:** `apps/web` contains no automated test files, and the linting configuration is broken (incompatibility between ESLint v9 and legacy `.eslintrc.cjs`). This forces manual verification or reliance on build success and type checking.
**Action:** When working on `apps/web`, prioritize `bun run build` and `bun x tsc --noEmit` for verification. Do not rely on `pnpm lint` or `pnpm test`.
