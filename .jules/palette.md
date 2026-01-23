## 2024-12-16 - [Tooltips on Disabled Buttons]
**Learning:** MUI Tooltips do not trigger on disabled elements because they don't emit pointer events. This prevents users from understanding why an action is unavailable.
**Action:** Wrap disabled IconButtons in a `Box` with `component="span"` and `sx={{ display: 'inline-flex' }}` before applying the Tooltip.
