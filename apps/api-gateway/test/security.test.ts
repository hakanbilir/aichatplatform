import { describe, it, expect } from 'bun:test';
import bcrypt from 'bcryptjs';

describe('Security: Timing Attack Prevention', () => {
  it('should take significant time to verify dummy hash', async () => {
    const password = 'randompassword';
    // This is the hash used in apps/api-gateway/src/routes/auth.ts
    const validDummyHash = '$2a$10$6vVhH5YEag8nrhUyHA78yu464P.BImgvOrTWPwQqyFWLs21hesqT.';

    const start = performance.now();
    await bcrypt.compare(password, validDummyHash);
    const end = performance.now();

    const duration = end - start;

    // A valid bcrypt hash with cost 10 should take > 50ms on most modern CPUs
    // If it was failing fast (invalid hash), it would be < 1ms
    console.log(`Dummy hash verification took: ${duration.toFixed(2)}ms`);
    expect(duration).toBeGreaterThan(20); // 20ms is a safe lower bound to distinguish from 0.04ms
  });
});
