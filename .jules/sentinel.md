## 2026-01-17 - Timing Attack via Invalid Dummy Hash
**Vulnerability:** The authentication system used a syntactically invalid bcrypt hash (`$2a$10$dummyhash...`) for dummy verification when a user was not found. `bcryptjs` rejects invalid hashes almost instantly (< 1ms), while valid verifications take ~100ms. This timing discrepancy allowed attackers to enumerate valid email addresses.
**Learning:** Security libraries like `bcryptjs` fail fast on invalid inputs. A "dummy" value must be indistinguishable from a real value in both structure and processing time.
**Prevention:** Always use a valid, pre-computed hash for dummy verifications. Ensure the cost factor matches the production configuration. Verify timing consistency with tests.
