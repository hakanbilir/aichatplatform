## 2025-12-28 - Missing ARIA labels on critical navigation elements
**Learning:** Icon-only buttons (mobile menu, clear search, logout) were completely inaccessible to screen readers. This is a common pattern in MUI apps where `IconButton` is used without `aria-label`.
**Action:** Always check `IconButton` usage during development. Ensure `aria-label` is present, preferably using i18n keys for localization.
