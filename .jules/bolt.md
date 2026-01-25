## 2024-05-22 - [Chat Message Re-rendering]
**Learning:** Streaming chat responses cause the entire message history to re-render on every token update if message components are not memoized.
**Action:** Use `React.memo` for list items in high-frequency update lists like chat histories.
