## 2026-01-16 - [Chat View Re-render Cascade]
**Learning:** Streaming responses trigger full re-renders of the chat history because `MessageBubble` components lack memoization and the parent `ChatView` re-renders on every token.
**Action:** Always wrap list items in `React.memo` when the parent list updates frequently (like during streaming).
