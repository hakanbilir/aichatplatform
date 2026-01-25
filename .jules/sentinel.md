## 2025-02-18 - [Inconsistent Password Policy]
**Vulnerability:** Production signup flow had weaker password requirements (min 8 chars) than the internal demo/auto-create flow (which enforced complexity).
**Learning:** Security controls implemented in helper functions (like `validatePasswordStrength`) are easily bypassed if not applied universally or integrated into the core validation schema (Zod).
**Prevention:** Centralize security validation logic in shared schemas or middleware that apply to all relevant entry points, rather than ad-hoc checks in specific code paths.
