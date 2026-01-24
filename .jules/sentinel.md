## 2025-10-24 - Timing Attack in Auth
**Vulnerability:** The authentication flow attempted to prevent user enumeration by running a dummy password verification when a user wasn't found. However, it used an invalid bcrypt hash string (`$2a$10$dummy...`). `bcrypt.compare` fails fast on invalid formats (19ms vs 100ms), failing to mask the response time difference.
**Learning:** "Dummy" hashes must be syntactically valid and have the same cost factor as real hashes to ensure the CPU work is actually performed. A string looking like a hash isn't enough.
**Prevention:** Use a pre-calculated, valid bcrypt hash constant in the code for dummy verifications, and verify its timing characteristics during development.
