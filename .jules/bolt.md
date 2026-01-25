## 2024-05-22 - Memory vs Reality Check
**Learning:** The project memory stated that `MessageBubble` was memoized with `React.memo`, but source code inspection revealed it was a standard functional component. This would cause massive unnecessary re-renders during chat streaming.
**Action:** Always verify "known facts" in memory against the actual codebase before skipping optimizations.
