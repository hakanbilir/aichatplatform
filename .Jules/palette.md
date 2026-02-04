## 2024-10-12 - MUI Tooltip with Disabled Buttons
**Learning:** In this codebase's MUI setup, wrapping a disabled `IconButton` directly in a `Tooltip` prevents the tooltip from appearing and may cause accessibility issues because disabled elements don't fire events.
**Action:** Always wrap disabled interactive elements in a `<span>` or `Box` when inside a `Tooltip` to ensure the tooltip triggers and the element remains semantically discoverable (if desired), or ensure the `aria-label` is on the wrapper if the button is removed from the A11y tree.

## 2025-05-22 - Strict Import Ordering
**Learning:** The project enforces strict `import/order` rules requiring empty lines between built-in, external, and internal import groups.
**Action:** Always group imports: 1. React, 2. External libs (MUI, i18n), 3. Internal components/hooks, with blank lines between groups.
