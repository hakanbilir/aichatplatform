## Palette Journal

## 2026-01-14 - Missing Accessible Names on Icon Buttons
**Learning:** Icon-only buttons (like the chat send button) were implemented without ARIA labels or tooltips, making them inaccessible to screen readers.
**Action:** When using `IconButton`, always wrap in `Tooltip` and provide an explicit `aria-label` (using translations). Wrap `IconButton` in `<span>` if it can be disabled to ensure Tooltip works.
