## 2025-12-29 - [Icon-Only Button Accessibility]
**Learning:** Icon-only buttons (like hamburger menus, close icons, and search clear buttons) are frequent accessibility gaps in Material UI implementations. They often lack `aria-label` because developers rely on the visual icon.
**Action:** Always check `IconButton` components for an `aria-label` or `title` prop. When adding `aria-label`, try to use existing translation keys from `common.json` (like "close", "open", "logout") to maintain i18n support without bloat.
