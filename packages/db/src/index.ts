import { PrismaClient } from '@prisma/client';

// In dev mode, we use a global singleton to avoid exhausting connections
// when modules are hot-reloaded.
// Development modunda, modüller hot-reload edildiğinde bağlantıların tükenmesini önlemek için global singleton kullanıyoruz.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Ensures that required database extensions (like pgvector) exist.
 * Should be called once at application startup in API/worker processes.
 * Gerekli veritabanı uzantılarının (pgvector gibi) mevcut olduğundan emin olur.
 * API/worker süreçlerinde uygulama başlangıcında bir kez çağrılmalıdır.
 */
export async function ensureDbExtensions(): Promise<void> {
  // "vector" extension for pgvector (used by KnowledgeChunk.embedding)
  // pgvector için "vector" uzantısı (KnowledgeChunk.embedding tarafından kullanılır)
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');
}

/**
 * Simple health check for DB connectivity.
 * Can be used by services at startup.
 * Veritabanı bağlantısı için basit sağlık kontrolü.
 * Servisler tarafından başlangıçta kullanılabilir.
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
 * Süresi dolmuş refresh token'ları periyodik olarak temizle.
 * @returns The number of tokens deleted.
 * @returns Silinen token sayısı.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  });
  return result.count;
}
