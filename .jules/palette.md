## 2025-02-19 - [Accessibility on Disabled Buttons]
**Learning:** In Material UI (and React in general), disabled buttons (`<button disabled>`) do not emit mouse events (mouseenter, mouseleave), which prevents Tooltips from appearing. This creates a UX gap where users don't know *why* an action is disabled.
**Action:** Always wrap disabled `IconButton` (or `Button`) elements in a `<span>` or `Box` (with `component="span"` and `display="inline-flex"`) when a Tooltip is required. This wrapper captures the hover event to trigger the Tooltip.
