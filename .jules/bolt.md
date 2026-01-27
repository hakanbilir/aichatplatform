## 2026-01-27 - Chat Message List Performance
**Learning:** Rendering a chat message list without memoization causes O(N) re-renders for every token streamed. This is a critical bottleneck for long conversations.
**Action:** Always wrap list item components (like `MessageBubble`) in `React.memo` when the parent updates frequently (e.g., during streaming). Ensure props are stable or primitives.
