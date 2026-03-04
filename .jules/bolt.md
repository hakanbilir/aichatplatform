## YYYY-MM-DD - [Title]

**Issue:** [What broke]
**Learning:** [Why it happened]
**Fix:** [How to prevent]

## 2026-01-26 - Debounce search input rendering in ConversationList

**Issue:** Synchronous filtering and rendering of large unvirtualized conversation lists blocked the main thread on every keystroke in `apps/web/src/chat/ConversationList.tsx`.
**Learning:** `useDeferredValue` is highly effective at decoupling fast UI updates (like controlled text inputs) from heavy downstream rendering cycles, maintaining UI responsiveness without resorting to complex worker offloading.
**Fix:** Introduced `useDeferredValue` for the search query to ensure typing remains fluid while the application filters and renders the conversation list at low priority.
