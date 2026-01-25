## 2026-01-25 - [Disabled States in Chat Inputs]
**Learning:** Users often click "Send" repeatedly when a message input is empty if the button looks active. Relying solely on internal logic to prevent sending without visual feedback frustrates users.
**Action:** Always visually disable action buttons when their prerequisite state (e.g., non-empty input) is not met, and ensure they have ARIA labels explaining the state.
