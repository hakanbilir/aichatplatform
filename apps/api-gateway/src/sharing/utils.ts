// apps/api-gateway/src/sharing/utils.ts

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

export function generateSlug(): string {
  return crypto.randomBytes(6).toString('base64url');
}

export async function hashPassphrase(passphrase: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(passphrase, saltRounds);
}

export async function verifyPassphrase(hash: string, passphrase: string): Promise<boolean> {
  return bcrypt.compare(passphrase, hash);
}

