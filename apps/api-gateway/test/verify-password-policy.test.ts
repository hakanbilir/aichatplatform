import { describe, it, expect } from 'bun:test';

import { signupBodySchema } from '../src/routes/auth';

describe('Password Policy Verification', () => {
  it('should reject weak passwords (no uppercase)', () => {
    const weakData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const result = signupBodySchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Password must contain at least one uppercase letter',
      );
    }
  });

  it('should reject weak passwords (no lowercase)', () => {
    const weakData = {
      email: 'test@example.com',
      password: 'PASSWORD123',
      name: 'Test User',
    };
    const result = signupBodySchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Password must contain at least one lowercase letter',
      );
    }
  });

  it('should reject weak passwords (no number)', () => {
    const weakData = {
      email: 'test@example.com',
      password: 'PasswordExample',
      name: 'Test User',
    };
    const result = signupBodySchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must contain at least one number');
    }
  });

  it('should reject short passwords', () => {
    const weakData = {
      email: 'test@example.com',
      password: 'Pass1',
      name: 'Test User',
    };
    const result = signupBodySchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
    }
  });

  it('should accept strong passwords', () => {
    const strongData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };
    const result = signupBodySchema.safeParse(strongData);
    expect(result.success).toBe(true);
  });
});
