## 2025-02-18 - [Trust Code Over Memory]
**Learning:** Memory indicated `MessageBubble` was already memoized, but source code proved otherwise. Always verify the actual file content before assuming optimization status.
**Action:** Always `read_file` to confirm current state before skipping an optimization based on memory or assumptions.
