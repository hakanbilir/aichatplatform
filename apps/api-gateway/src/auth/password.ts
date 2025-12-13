import bcrypt from 'bcryptjs';
import { getConfig } from '@ai-chat/config';

const config = getConfig();

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

