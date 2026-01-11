## 2024-05-23 - Timing Attack via Invalid Dummy Hash
**Vulnerability:** User Enumeration via Timing Attack
**Learning:** The `bcryptjs` library fails-fast (approx 20ms) when provided with a syntactically invalid hash string (e.g. invalid length or structure), compared to a full verification (approx 100ms). This allowed attackers to distinguish between "user not found" (fast) and "invalid password" (slow) responses, enabling user enumeration.
**Prevention:** When using dummy hashes to mask user existence errors, ALWAYS use a pre-calculated, valid bcrypt hash (with correct cost factor and salt structure) to ensuring the `compare` function executes the full hashing algorithm.
