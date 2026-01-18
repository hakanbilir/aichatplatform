## 2025-12-16 - Timing Attack via Invalid BCrypt Hash
**Vulnerability:** User enumeration was possible via timing attacks because `bcryptjs` rejects invalid hash strings (dummy hashes) instantly (<1ms) while valid password verification takes ~100ms.
**Learning:** Security libraries often fail-fast on invalid inputs. When implementing "dummy" operations for timing consistency, the dummy data must be syntactically valid to ensure the library processes it fully.
**Prevention:** Always use a pre-calculated, valid hash/token/secret for dummy verification steps. Verify timing with a script.
