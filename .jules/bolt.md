## 2026-01-27 - Chat Message List Performance
**Learning:** Rendering a chat message list without memoization causes O(N) re-renders for every token streamed. This is a critical bottleneck for long conversations.
**Action:** Always wrap list item components (like `MessageBubble`) in `React.memo` when the parent updates frequently (e.g., during streaming). Ensure props are stable or primitives.

## 2026-01-28 - Route Code Splitting
**Learning:** Static imports of all page components in `router.tsx` cause a massive initial bundle size. Using `React.lazy` with `Suspense` significantly reduces initial load time.
**Action:** Use `React.lazy` for all route components. For named exports, use the pattern: `lazy(() => import('./...').then(m => ({ default: m.Component })))`. Wrap `Outlet` in layout components with `Suspense` to preserve UI structure during navigation.
