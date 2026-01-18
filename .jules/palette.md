## 2024-05-22 - [Accessible Icon Buttons]
**Learning:** Icon-only buttons (like Send) are invisible to screen readers without `aria-label`. Also, disabled buttons don't trigger Tooltips in MUI unless wrapped in a container like `<span>`.
**Action:** Always wrap `IconButton` in a Tooltip with a span wrapper, and ensure `aria-label` matches the tooltip text.
