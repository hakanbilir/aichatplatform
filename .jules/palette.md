## 2025-01-29 - [Material UI Tooltips on Disabled Buttons]
**Learning:** Material UI's `Tooltip` component does not trigger on disabled elements (like the Send button with empty input) because disabled elements don't fire mouse events.
**Action:** Always wrap disabled `IconButton` components in a `<span>` when using a `Tooltip`. When verifying with Playwright, use `.hover(force=True)` or target the wrapper span, as the span intercepts the pointer events.
