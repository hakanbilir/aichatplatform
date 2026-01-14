## 2024-05-22 - Icon Button Accessibility
**Learning:** Icon-only buttons (like the chat send button) are a common accessibility trap. Without an explicit `aria-label` or `Tooltip`, screen readers provide no context, and keyboard users miss visual cues.
**Action:** Always wrap `IconButton` with a `Tooltip` and provide a matching `aria-label`. This serves double duty: helpful context for mouse users and essential identification for assistive technology.
