## 2024-05-22 - Missing Password Visibility Toggles
**Learning:** Users across multiple authentication and sharing flows lacked the ability to see what they were typing in password/passphrase fields, likely leading to frustration and errors.
**Action:** Ensure all password inputs include a visibility toggle using standard UI components (`InputAdornment` with `IconButton`).

## 2025-02-18 - Contextual Copy Actions in Chat
**Learning:** Chat messages, especially from assistants, often contain copyable content. Users expect these actions to be available but unobtrusive.
**Action:** Implement hover-visible copy buttons on assistant messages using standard accessible patterns (`opacity: 0` -> `opacity: 1` on hover).
