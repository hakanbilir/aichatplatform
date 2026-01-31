## 2024-10-12 - MUI Tooltip with Disabled Buttons
**Learning:** In this codebase's MUI setup, wrapping a disabled `IconButton` directly in a `Tooltip` prevents the tooltip from appearing and may cause accessibility issues because disabled elements don't fire events.
**Action:** Always wrap disabled interactive elements in a `<span>` or `Box` when inside a `Tooltip` to ensure the tooltip triggers and the element remains semantically discoverable (if desired), or ensure the `aria-label` is on the wrapper if the button is removed from the A11y tree.

## 2025-05-23 - Focus Visibility for Hidden Actions
**Learning:** Interactive elements hidden with `opacity: 0` (like message actions) remain in the tab order but are invisible when focused, failing WCAG 2.4.7.
**Action:** Always include `&:focus-within` (or `&:focus`) selectors alongside `:hover` when revealing actions to ensure keyboard users can see what they are interacting with.
