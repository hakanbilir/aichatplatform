## 2025-10-27 - Eager Imports in Router
**Learning:** `apps/web/src/router.tsx` imports all page components eagerly. This results in a monolithic initial bundle, as confirmed by the Vite build warning "Some chunks are larger than 500 kB".
**Action:** Future optimizations should implement `React.lazy` and `Suspense` for route components to split the code and improve initial load time.
