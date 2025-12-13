// apps/api-gateway/src/auth/refreshToken.ts

import crypto from 'node:crypto';
import { prisma } from '@ai-chat/db';
import { getConfig } from '@ai-chat/config';

const config = getConfig();

export interface RefreshTokenData {
  token: string;
  expiresAt: Date;
}

export async function generateRefreshToken(userId: string): Promise<RefreshTokenData> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt
    }
  });

  return { token, expiresAt };
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string } | null> {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: { select: { id: true } } }
  });

  if (!refreshToken) {
    return null;
  }

  if (refreshToken.isRevoked) {
    return null;
  }

  if (refreshToken.expiresAt < new Date()) {
    return null;
  }

  return { userId: refreshToken.user.id };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { token },
    data: { isRevoked: true }
  });
}

export async function revokeAllUserRefreshTokens(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: {
      userId,
      isRevoked: false
    },
    data: {
      isRevoked: true
    }
  });
}

// Clean up expired tokens periodically
// Süresi dolmuş token'ları periyodik olarak temizle
// Note: This function has been moved to @ai-chat/db package
// Not: Bu fonksiyon @ai-chat/db paketine taşınmıştır
export { cleanupExpiredTokens } from '@ai-chat/db';





