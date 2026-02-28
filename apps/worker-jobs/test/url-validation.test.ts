import { describe, expect, it, mock } from 'bun:test';

// Mock the DB module to prevent @prisma/client initialization errors in unit tests
// This must be done before importing the module under test
mock.module('@ai-chat/db', () => ({
  prisma: {
    webhookDelivery: {
      findUnique: mock(),
      update: mock(),
      findMany: mock(),
    },
  },
}));

import { isValidWebhookUrl } from '../src/webhookDispatcher';

describe('isValidWebhookUrl', () => {
  it('should allow valid public URLs', async () => {
    // Note: This relies on external DNS resolution for google.com
    const result = await isValidWebhookUrl('https://google.com');
    expect(result).toBe(true);
  });

  it('should allow valid public IP URLs', async () => {
    // Cloudflare DNS
    const result = await isValidWebhookUrl('https://1.1.1.1');
    expect(result).toBe(true);
  });

  it('should reject localhost', async () => {
    const result = await isValidWebhookUrl('http://localhost:3000');
    expect(result).toBe(false);
  });

  it('should reject 127.0.0.1', async () => {
    const result = await isValidWebhookUrl('http://127.0.0.1:8080');
    expect(result).toBe(false);
  });

  it('should reject 0.0.0.0', async () => {
    const result = await isValidWebhookUrl('http://0.0.0.0:8080');
    expect(result).toBe(false);
  });

  it('should reject [::1]', async () => {
    const result = await isValidWebhookUrl('http://[::1]:8080');
    expect(result).toBe(false);
  });

  it('should reject private IPv4 range 10.x.x.x', async () => {
    const result = await isValidWebhookUrl('http://10.0.0.5');
    expect(result).toBe(false);
  });

  it('should reject private IPv4 range 172.16.x.x', async () => {
    const result = await isValidWebhookUrl('http://172.16.0.1');
    expect(result).toBe(false);
  });

  it('should reject private IPv4 range 192.168.x.x', async () => {
    const result = await isValidWebhookUrl('http://192.168.1.1');
    expect(result).toBe(false);
  });

  it('should reject link-local IPv4 169.254.x.x', async () => {
    const result = await isValidWebhookUrl('http://169.254.169.254');
    expect(result).toBe(false);
  });

  it('should reject non-http/https protocols', async () => {
    const result = await isValidWebhookUrl('ftp://google.com');
    expect(result).toBe(false);
  });

  it('should reject invalid URLs', async () => {
    const result = await isValidWebhookUrl('not-a-url');
    expect(result).toBe(false);
  });
});
