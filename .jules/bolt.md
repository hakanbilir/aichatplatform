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

## 2026-05-22 - Deep Linking Broken in ChatPage
**Learning:** The `ChatPage` component relied solely on custom events (`select-conversation`) to update its state, ignoring the React Router `useParams`. This caused direct URL navigation (deep linking) to fail, loading an empty state instead of the conversation, which also broke automated verification scripts relying on direct navigation.
**Action:** When implementing route components, always sync internal state with `useParams` to ensure the URL remains the source of truth for navigation state.

## 2026-07-20 - Streaming Message Child Component Performance
**Learning:** In a streaming chat UI, the `MessageBubble` component re-renders on every token. Child components like `ThinkingBubble` re-render unnecessarily even if their content (`thought`) is stable, because `React.memo` is missing. This adds significant overhead during long generations.
**Action:** Memoize child components of frequently updating parents, especially if the children render DOM elements or have their own internal state/animations.

## 2026-08-15 - ChatPage Child Component Performance
**Learning:** In a high-frequency update component like `ChatPage` (streaming), all heavy child components (Drawers, Panels) must be memoized. Crucially, any callbacks passed to them must be stabilized with `useCallback`, and any hooks (like `usePromptTemplates`) returning functions passed to these callbacks must also stabilize their return values.
**Action:** Wrap child components in `React.memo`, wrap handlers in `useCallback`, and ensure custom hooks return memoized functions.

## 2026-10-27 - Unused Hook State Causing Re-renders
**Learning:** Custom hooks (like `useSpeechToText`) that update internal state (e.g., `interimTranscript`) frequently will force the consuming component (`ChatPage`) to re-render on every update, even if the consumer does not use that specific state variable. This caused massive unnecessary re-rendering during voice input.
**Action:** If a hook has high-frequency state updates that are optional, expose an option (e.g., `interimResults: false`) to disable that state update logic entirely to prevent re-renders in consumers that don't need it.

## 2026-12-16 - JSON Aggregation in Prisma
**Learning:** Prisma's standard `aggregate` functions do not support aggregation on JSON fields (e.g., summing `meta->'usage'->>'promptTokens'`). Fetching all records to aggregate in the application layer causes significant performance degradation (O(N) memory and IO).
**Action:** Use `prisma.$queryRaw` with database-specific SQL (e.g., Postgres `CAST(json->>field AS INTEGER)`) to perform aggregation in the database, reducing data transfer and memory usage to O(1).

## 2026-12-16 - Streaming React State Re-renders
**Learning:** Storing high-frequency streaming data (e.g., chat tokens, 50-100 updates/sec) in React state at a high level (`ChatPage`) causes the entire component tree to re-render on every update, leading to significant CPU usage and lag.
**Action:** Move mutable streaming state to a `StreamStore` (external to React state) and use `useSyncExternalStore` in a dedicated leaf component (`StreamedMessage`) to subscribe to updates. This isolates re-renders to the single component displaying the stream.

## 2026-12-17 - Reducer State Referential Integrity during Streaming
**Learning:** Even when using an external `StreamStore` for high-frequency data, dispatching actions (like `TOKEN`) to a `useReducer` that returns a *new* state object (reference inequality) for every event will still force the consuming component (`ChatPage`) to re-render 50+ times/sec, negating the benefits of the store.
**Action:** In `useReducer`, ensure that high-frequency actions (like `TOKEN`) return the *existing* state object (reference equality) if the relevant state properties (like `status`) haven't actually changed. This allows React to bail out of re-renders.
