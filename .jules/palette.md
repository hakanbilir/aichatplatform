## 2025-02-18 - Tooltip on Disabled Buttons
**Learning:** MUI Tooltips do not trigger on disabled elements because disabled elements do not fire mouse events. Wrapping the disabled button in a `<span>` allows the tooltip to capture the hover event, but this `<span>` must have `display: 'flex'` or `block` to respect the layout context (e.g., inside a flex container).
**Action:** Always wrap disabled icon buttons in a span with appropriate display style when adding tooltips to ensure accessibility for all users.
