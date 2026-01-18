## 2025-12-16 - Mitigating Timing Attacks in Auth
**Learning:** Preventing user enumeration requires consistent response times. "Dummy" password verifications must perform actual work (valid bcrypt hash) rather than failing fast on invalid inputs.
**Action:** Implemented a valid dummy hash in `apps/api-gateway` to ensure "user not found" responses take ~100ms, matching the "user found" path.
