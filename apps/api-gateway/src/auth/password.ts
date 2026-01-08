import bcrypt from 'bcryptjs';
import { getConfig } from '@ai-chat/config';

const config = getConfig();

// A valid bcrypt hash (cost 10) for timing attack prevention
// Timing attack önleme için geçerli bir bcrypt hash'i (cost 10)
// Generated from 'dummy_password_for_timing_attack_prevention'
export const DUMMY_PASSWORD_HASH = '$2b$10$42/tlNYx.J9qNPjGjPYEguL6lBAg.FkS41oRmGwot3DIA53v1FuWu';

/**
 * Hash a plain text password using bcrypt.
 * Düz metin şifreyi bcrypt kullanarak hash'le.
 */
export async function hashPassword(plain: string): Promise<string> {
  const rounds = config.BCRYPT_SALT_ROUNDS;
  const salt = await bcrypt.genSalt(rounds);
  return bcrypt.hash(plain, salt);
}

/**
 * Verify a plain text password against a hash.
 * Düz metin şifreyi bir hash'e karşı doğrula.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Validate password strength.
 * Şifre gücünü doğrula.
 *
 * Rules:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 */
export function validatePasswordStrength(pwd: string): void {
  if (pwd.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(pwd)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(pwd)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(pwd)) {
    throw new Error('Password must contain at least one number');
  }
}
