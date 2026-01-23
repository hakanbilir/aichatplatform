## 2025-10-26 - [Legacy Code in src/modules Breaks Build]
**Vulnerability:** Build process fragility. The `apps/api-gateway` project contains a `src/modules` directory with legacy NestJS code that is not compatible with the current environment and dependencies, causing `tsc` to fail.
**Learning:** This prevents running `bun run build` or `tsc` to verify changes in the active `src/routes` code. The legacy code seems unused by the active Fastify app but is still included in `tsconfig.json`.
**Prevention:** In the future, `src/modules` should be excluded from `tsconfig.json` or removed entirely. For now, temporary exclusion is necessary to verify type safety of new changes.

## 2025-10-26 - [Fastify Rate Limit Encapsulation]
**Vulnerability:** Ineffective rate limiting. The `fastify-rate-limit` plugin was registered multiple times on the root instance with different prefixes, which can lead to conflicts or ineffective limits if not handled correctly with encapsulation.
**Learning:** Registering the plugin once globally and then using route-specific `config: { rateLimit: ... }` provides a more robust and granular control mechanism, avoiding plugin scope issues.
**Prevention:** Always prefer route-level configuration for specific limits over multiple plugin registrations.
