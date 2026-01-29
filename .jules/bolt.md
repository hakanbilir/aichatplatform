## 2026-01-27 - Chat Message List Performance
**Learning:** Rendering a chat message list without memoization causes O(N) re-renders for every token streamed. This is a critical bottleneck for long conversations.
**Action:** Always wrap list item components (like `MessageBubble`) in `React.memo` when the parent updates frequently (e.g., during streaming). Ensure props are stable or primitives.

## 2026-01-28 - Route Code Splitting
**Learning:** Static imports of all page components in `router.tsx` cause a massive initial bundle size. Using `React.lazy` with `Suspense` significantly reduces initial load time.
**Action:** Use `React.lazy` for all route components. For named exports, use the pattern: `lazy(() => import('./...').then(m => ({ default: m.Component })))`. Wrap `Outlet` in layout components with `Suspense` to preserve UI structure during navigation.

## 2026-01-29 - N+1 Fetch in useEffect Dependencies
**Learning:** Including state variables (like `selectedId`) that trigger updates in the same effect that fetches data causes unnecessary re-fetching (N+1 query equivalent) when the state changes.
**Action:** Remove state variables that are not required for the fetch itself from the dependency array, or split the effect into "data fetching" (depends on criteria) and "reaction" (depends on state).

## 2026-02-04 - List Selection Performance
**Learning:** In lists where a single item is selected (e.g., navigation sidebars), storing `selectedId` in the parent component causes the entire list to re-render when selection changes.
**Action:** Extract the list item into a `React.memo` component and ensure callback props (like `onSelect`) are stable using `useCallback`. This reduces re-renders from O(N) to O(1) (only the 2 changed items update).
