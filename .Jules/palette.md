## 2024-05-22 - Icon-only Buttons and Tooltips
**Learning:** `IconButton` inside `Tooltip` must be wrapped in `<span>` if it can be disabled.
**Action:** Always wrap `IconButton` in `<span>` when adding tooltips to avoid React warnings and ensure tooltip works on disabled state.

## 2024-05-22 - Playwright and MUI Tooltips
**Learning:** MUI Tooltips may duplicate the `aria-label` on the trigger element (or wrapper), causing Playwright's `get_by_label` to fail with strict mode violation.
**Action:** Use `get_by_role('button', { name: '...' })` to specifically target the button when verifying localized labels.
