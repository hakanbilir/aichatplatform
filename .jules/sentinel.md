## 2025-01-26 - Timing Attack in Auth
**Vulnerability:** User enumeration was possible in the login flow because `bcrypt.compare` failed fast (< 0.1ms) when provided with an invalid dummy hash string, compared to ~100ms for a valid user.
**Learning:** `bcrypt` (and `bcryptjs`) may optimize comparison by rejecting invalid hash formats immediately. Always use a structurally valid hash (correct prefix, salt, and length) for dummy comparisons to ensure consistent timing.
**Prevention:** Generate a valid hash using the same cost factor and store it as a constant for use in dummy verification paths.
