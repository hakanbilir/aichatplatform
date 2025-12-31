## 2025-05-23 - Chat Input Accessibility
**Learning:** `TextField` in Material UI doesn't automatically expose an accessible name when only `placeholder` is provided. It requires `inputProps={{ 'aria-label': ... }}` or a visible `label`.
**Action:** Always check `inputProps` on `TextField` when designed without a visible label.

## 2025-05-23 - Icon Buttons
**Learning:** Icon-only buttons are invisible to screen readers without an `aria-label`.
**Action:** Always add `aria-label` to `IconButton` components.
