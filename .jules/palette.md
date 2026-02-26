## 2024-05-24 - Accessible Loading States

**Learning:** Loading spinners and skeletons are dynamic content updates that often get missed by screen readers if not properly marked.
**Action:** Always wrap loading indicators in a container with `role="status"` and `aria-live="polite"` (or `aria-busy="true"` for skeletons) to ensure users are aware that content is being fetched.
