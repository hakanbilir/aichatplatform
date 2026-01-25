# Palette's Journal

## 2026-01-25 - Disabled Button Tooltips in MUI
**Learning:** Material UI `Tooltip` components fail to trigger on disabled `IconButton` elements because the disabled state prevents mouse event propagation. This leaves users unsure why an action (like "Send Message") is unavailable.
**Action:** When implementing tooltips on buttons that can be disabled (e.g., empty form submission), always wrap the button in a `<span>` to ensure the tooltip remains interactive and accessible.
