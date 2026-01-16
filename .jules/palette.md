## 2026-01-16 - [Icon-Only Button Accessibility]
**Learning:** Multiple icon-only buttons (Send, Close, More Actions) across the application were missing `aria-label` attributes, relying solely on visual icons or tooltips (sometimes missing too). This makes the app difficult to navigate for screen reader users.
**Action:** Systematically audit all `IconButton` usage and ensure they are wrapped in `Tooltip` and have a descriptive `aria-label` (using translations).
