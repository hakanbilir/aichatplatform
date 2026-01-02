## 2024-05-23 - Chat Input Accessibility
**Learning:** Chat inputs often rely on visual context (position at bottom, placeholder text) and lack explicit labels, creating barriers for screen reader users. Adding dynamic ARIA labels to "Send" buttons (e.g., "Sending..." vs "Send message") provides crucial state feedback that is otherwise purely visual (spinner vs icon).
**Action:** Always verify `aria-label` or `aria-labelledby` exists on form inputs that lack a visible `<label>`, and ensure action buttons communicate their processing state to assistive technology.
