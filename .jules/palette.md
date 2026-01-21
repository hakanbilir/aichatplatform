## 2024-05-20 - [Button Tooltips]
**Learning:** Material UI's `Tooltip` component does not trigger on disabled elements because disabled DOM elements do not emit mouse events. This is a common accessibility and UX pitfall.
**Action:** Always wrap disabled `IconButton` (or any disabled interactive element) in a `Box` or `span` with `display: 'inline-flex'` (to preserve layout) when adding a `Tooltip`. This ensures the tooltip can capture the hover event and display the helpful text even when the action is unavailable.
