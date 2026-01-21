## 2025-05-15 - [Frontend Verification Pattern]
**Learning:** Verifying authenticated components (like `ConversationList`) in isolation is effective by creating a temporary public route (`/test-ux`) and using Playwright's `page.route()` to mock API calls (`/api/v1/conversations`, `/api/v1/auth/me`). Injecting tokens via `localStorage` bypasses login flows while satisfying `AuthContext`.
**Action:** Adopt this pattern for verifying UI changes in protected components without spinning up the full backend stack.
