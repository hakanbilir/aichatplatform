import { describe, it, expect } from 'bun:test';
import bcrypt from 'bcryptjs';

// We duplicate the hash here to ensure the test verifies the exact string used in production code
// If the code changes, this test should be updated or it will test a different hash
const PROD_DUMMY_HASH = '$2a$10$aR533mPeGoh2e5xbXhcZD./AisZfYia3/F9JCy3DCDY7S.LQWCiWG';
const OLD_INVALID_HASH = '$2a$10$dummyhashfordummyverificationpurposesonly';

describe('Auth Timing Security', () => {
  it('should take significant time to verify the production dummy hash', async () => {
    const password = 'random_password_check';

    const start = performance.now();
    await bcrypt.compare(password, PROD_DUMMY_HASH);
    const end = performance.now();
    const duration = end - start;

    console.log(`Production Dummy Hash Duration: ${duration.toFixed(2)}ms`);

    // Valid bcrypt comparison (cost 10) usually takes ~100ms.
    // If it takes less than 10ms, it's definitely failing fast (skipping work).
    expect(duration).toBeGreaterThan(10);
  });

  it('should fail fast on the old invalid hash', async () => {
    const password = 'random_password_check';

    const start = performance.now();
    // Use try-catch because some versions might throw, though bcryptjs usually just returns false fast
    try {
        await bcrypt.compare(password, OLD_INVALID_HASH);
    } catch (e) {
        // failure is also fast
    }
    const end = performance.now();
    const duration = end - start;

    console.log(`Old Invalid Hash Duration: ${duration.toFixed(2)}ms`);

    // The invalid hash should be rejected almost instantly
    expect(duration).toBeLessThan(10);
  });

  it('should have comparable timing between real hash and dummy hash', async () => {
     const password = 'random_password_check';
     const salt = await bcrypt.genSalt(10);
     const realHash = await bcrypt.hash(password, salt);

     const startReal = performance.now();
     await bcrypt.compare(password, realHash);
     const endReal = performance.now();
     const realDuration = endReal - startReal;

     const startDummy = performance.now();
     await bcrypt.compare(password, PROD_DUMMY_HASH);
     const endDummy = performance.now();
     const dummyDuration = endDummy - startDummy;

     console.log(`Real: ${realDuration.toFixed(2)}ms, Dummy: ${dummyDuration.toFixed(2)}ms`);

     // We allow some variance, but they should be in the same order of magnitude
     const difference = Math.abs(realDuration - dummyDuration);

     // 30ms margin is generous but safe for CI flakes, while still catching the ~100ms vs ~0ms difference
     expect(difference).toBeLessThan(30);
  });
});
