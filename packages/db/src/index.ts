import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

// In dev mode, we use a global singleton to avoid exhausting connections.
// Dev modunda bağlantı tükenmesini önlemek için global singleton kullanıyoruz.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createUnavailableClient(error: unknown): PrismaClient {
  // Keep startup resilient in CI/test when Prisma client generation is unavailable.
  // Prisma generate yokken CI/test başlangıcını dayanıklı tut.
  const fail = () => {
    throw error instanceof Error ? error : new Error('Prisma client is unavailable');
  };

  return new Proxy(
    {},
    {
      get() {
        return fail;
      },
    },
  ) as PrismaClient;
}

function createPrismaClient(): PrismaClient {
  try {
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
    });
  } catch (error) {
    return createUnavailableClient(error);
  }
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Ensures that required database extensions (like pgvector) exist.
 * Should be called once at application startup in API/worker processes.
 * Gerekli veritabanı eklentilerini (pgvector gibi) kontrol eder.
 */
export async function ensureDbExtensions(): Promise<void> {
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
}

/**
 * Simple health check for DB connectivity.
 * Can be used by services at startup.
 * Veritabanı bağlantısını basitçe doğrular.
 */
export async function checkDbConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Database connection check failed:', err);
    return false;
  }
}

/**
 * Clean up expired refresh tokens periodically.
 * Süresi dolmuş refresh token kayıtlarını temizler.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });
  return result.count;
}
