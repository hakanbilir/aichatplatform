# Sentinel's Journal

## 2026-01-24 - [User Enumeration via Timing Attack]
**Vulnerability:** The login endpoint used an invalid bcrypt hash string for the dummy verification path. Because `bcrypt.compare` fails fast on invalid hash formats, the response time was significantly faster (sub-millisecond) when a user did not exist compared to when a user existed (approx. 100ms), allowing attackers to enumerate valid email addresses.
**Learning:** Bcrypt implementations may optimize by returning early if the hash format is invalid. To prevent timing attacks, the dummy operation must perform the same computational work as the real operation.
**Prevention:** Always use a valid, pre-calculated bcrypt hash (e.g., generated with the same cost factor) for dummy verifications. Do not use arbitrary strings.
