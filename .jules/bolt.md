## 2026-01-27 - Chat Message List Performance
**Learning:** Rendering a chat message list without memoization causes O(N) re-renders for every token streamed. This is a critical bottleneck for long conversations.
**Action:** Always wrap list item components (like `MessageBubble`) in `React.memo` when the parent updates frequently (e.g., during streaming). Ensure props are stable or primitives.

## 2026-01-28 - Route Code Splitting
**Learning:** Static imports of all page components in `router.tsx` cause a massive initial bundle size. Using `React.lazy` with `Suspense` significantly reduces initial load time.
**Action:** Use `React.lazy` for all route components. For named exports, use the pattern: `lazy(() => import('./...').then(m => ({ default: m.Component })))`. Wrap `Outlet` in layout components with `Suspense` to preserve UI structure during navigation.

## 2026-02-05 - Effect Dependencies causing N+1 Requests
**Learning:** `ConversationList` included `selectedId` in the `useEffect` dependency array, causing a full API re-fetch on every conversation selection. This created an implicit N+1 request pattern on the frontend.
**Action:** Audit `useEffect` dependencies carefully. Ensure state changes that only affect UI (like selection) do not trigger data re-fetching. Split effects into "Data Fetching" (deps: IDs, tokens) and "UI Sync" (deps: data, selection).
