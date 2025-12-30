## 2024-05-23 - MUI Tooltip on Disabled Buttons
**Learning:** MUI Tooltips on disabled buttons (specifically `IconButton`) do not trigger hover events because disabled elements have `pointer-events: none`.
**Action:** Always wrap disabled buttons in a `<span>` or `<div>` to capture the hover event for the Tooltip.
