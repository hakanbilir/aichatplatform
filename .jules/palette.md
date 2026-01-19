## 2024-05-22 - [MUI Disabled Tooltip Trap]
**Learning:** In Material UI, `Tooltip` components do not fire mouse events (hover) on disabled child elements like `IconButton`. This means users never see the tooltip explaining *why* a button is disabled.
**Action:** Always wrap disabled interactive elements in a `<span>` or `Box` (with `component="span"` and `display: "inline-flex"`) inside the `Tooltip` to capture the hover event.
