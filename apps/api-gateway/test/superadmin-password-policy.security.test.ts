import { describe, it, expect } from 'bun:test';
import { createUserSchema, updateUserPasswordSchema } from '../src/routes/superadmin';

describe('Superadmin Password Policy Security', () => {
  it('should reject weak passwords when creating user (no uppercase)', () => {
    const weakData = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };
    const result = createUserSchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Password must contain at least one uppercase letter',
      );
    }
  });

  it('should reject weak passwords when updating password (short)', () => {
    const weakData = {
      password: 'Pass1',
    };
    const result = updateUserPasswordSchema.safeParse(weakData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Password must be at least 8 characters');
    }
  });

  it('should accept strong passwords for create user', () => {
    const strongData = {
      email: 'test@example.com',
      password: 'Password123!',
      name: 'Test User',
    };
    const result = createUserSchema.safeParse(strongData);
    expect(result.success).toBe(true);
  });

  it('should accept strong passwords for update password', () => {
    const strongData = {
      password: 'Password123!',
    };
    const result = updateUserPasswordSchema.safeParse(strongData);
    expect(result.success).toBe(true);
  });
});
