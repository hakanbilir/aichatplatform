import { describe, test, expect, beforeAll, mock } from "bun:test";

// Mock the database layer to avoid connection errors
mock.module("@ai-chat/db", () => ({
  ensureDbExtensions: async () => {},
  checkDbConnection: async () => true,
  cleanupExpiredTokens: async () => 0,
  prisma: {
      $executeRawUnsafe: async () => {},
      user: { findUnique: async () => null },
      organization: { findUnique: async () => null },
      $queryRaw: async () => [1]
  }
}));

describe("CORS Security", () => {
    let app: any;

    beforeAll(async () => {
        // Set env BEFORE importing the app
        process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://allowed-origin.com';
        process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/db';
        process.env.REDIS_URL = 'redis://localhost:6379';
        process.env.JWT_SECRET = 'super-secret-key-at-least-16-chars';

        // Dynamic import to ensure env vars are picked up by config
        const { buildServer } = await import('../src/app');
        app = await buildServer();
    });

    test("Allowed Origin", async () => {
        const res = await app.inject({
            method: 'OPTIONS',
            url: '/health',
            headers: {
                'Origin': 'http://allowed-origin.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        expect(res.headers['access-control-allow-origin']).toBe('http://allowed-origin.com');
        expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    test("Disallowed Origin", async () => {
        const res = await app.inject({
            method: 'OPTIONS',
            url: '/health',
            headers: {
                'Origin': 'http://evil.com',
                'Access-Control-Request-Method': 'GET'
            }
        });
        // fastify-cors omits the header if origin is not allowed
        expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
});
