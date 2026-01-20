## 2025-05-15 - [MessageInput Accessibility & State]
**Learning:** Material UI `Tooltip` components do not trigger on disabled child elements like `IconButton`. This creates a poor UX where users can't see why a button is disabled or what it does.
**Action:** Always wrap disabled interactive elements in a `<span>` or `Box` (with `display: inline-flex` to preserve layout) when they need to display a Tooltip. This ensures the mouse events are captured by the wrapper.
