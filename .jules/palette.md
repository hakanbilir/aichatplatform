# Palette's Journal

## 2025-12-16 - Material UI Tooltips on Disabled Buttons
**Learning:** In Material UI, `Tooltip` components do not trigger on disabled children because disabled elements don't emit mouse events.
**Action:** Wrap disabled `IconButton` (or other interactive elements) in a `Box` with `component="span"` and `display: "inline-flex"` (or `block`) to ensure the tooltip appears.

## 2025-12-16 - Playwright Selectors for MUI TextFields
**Learning:** Material UI `TextField` with `multiline` renders two `textarea` elements (one hidden). Using generic locators like `page.locator('textarea')` causes strict mode violations.
**Action:** Use `page.get_by_role('textbox')` or specific `name`/`label` filters to target the visible input.
