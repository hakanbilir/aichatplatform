## 2025-05-18 - Missing ARIA on Icon Buttons
**Learning:** Icon-only buttons (like Send, Trash, Edit) are frequently missed in accessibility passes, leaving screen reader users with no context.
**Action:** Always check `IconButton` components for `aria-label` or `aria-labelledby`.
