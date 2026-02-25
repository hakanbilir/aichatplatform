// apps/worker-jobs/src/webhookDispatcher.ts

import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import net from 'node:net';
import { URL } from 'node:url';

import { prisma } from '@ai-chat/db';

// Helper to check for private/reserved IP ranges (IPv4 and IPv6)
function isIpPrivate(ip: string): boolean {
  if (net.isIPv4(ip)) {
    // IPv4 private ranges
    // 10.0.0.0/8
    // 172.16.0.0/12 - 172.31.255.255
    // 192.168.0.0/16
    // 127.0.0.0/8 (Loopback)
    // 169.254.0.0/16 (Link-local)
    const parts = ip.split('.').map(Number);
    if (parts[0] === 0) return true;
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 127) return true;
    if (parts[0] === 169 && parts[1] === 254) return true;
    return false;
  } else if (net.isIPv6(ip)) {
    // IPv6 private ranges
    // ::1 (Loopback)
    // fc00::/7 (Unique Local) -> fc00... to fdff...
    // fe80::/10 (Link Local) -> fe80... to febf...

    // Normalize? net.isIPv6 doesn't normalize.
    // Simple checks:
    if (ip === '::1') return true;
    if (ip === '::') return true; // Unspecified

    const lower = ip.toLowerCase();
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true;

    // Check for IPv4 mapped address ::ffff:127.0.0.1
    if (lower.startsWith('::ffff:')) {
      const ipv4Part = lower.substring(7);
      if (net.isIPv4(ipv4Part)) {
        return isIpPrivate(ipv4Part);
      }
    }

    return false;
  }
  return false;
}

// Validate URL to prevent SSRF
export async function isValidWebhookUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname;

    // Check if hostname is an IP literal
    if (net.isIP(hostname)) {
      return !isIpPrivate(hostname);
    }

    // Resolve hostname to check if it points to private IP
    // Use { all: true } to check all resolved addresses
    const addresses = await dns.lookup(hostname, { all: true });

    for (const addr of addresses) {
      if (isIpPrivate(addr.address)) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}


type JsonValue = null | string | number | boolean | { [key: string]: JsonValue } | JsonValue[];

function toJsonValue(value: unknown): JsonValue {
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => toJsonValue(item));
  if (typeof value === 'object') {
    const record: Record<string, JsonValue> = {};
    for (const [key, item] of Object.entries(value)) {
      record[key] = toJsonValue(item);
    }
    return record;
  }
  return String(value);
}
function hmacSignature(secret: string, payload: string, timestamp: number): string {
  const toSign = `${timestamp}.${payload}`;
  return crypto.createHmac('sha256', secret).update(toSign).digest('hex');
}

async function dispatchDelivery(deliveryId: string) {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      webhook: {
        include: {
          orgIntegration: true
        }
      },
      event: true
    }
  });

  if (!delivery || !delivery.webhook.isActive || !delivery.webhook.orgIntegration.isEnabled) {
    return;
  }

  const event = delivery.event;
  const payloadObj = {
    id: event.id,
    type: event.type,
    createdAt: event.createdAt.toISOString(),
    orgId: event.orgId,
    userId: event.userId,
    conversationId: event.conversationId,
    messageId: event.messageId,
    metadata: event.metadata
  };

  const body = JSON.stringify(payloadObj);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = hmacSignature(delivery.webhook.secret, body, timestamp);

  try {
    // SSRF Protection: Validate URL before fetching
    const isValid = await isValidWebhookUrl(delivery.webhook.url);
    if (!isValid) {
      throw new Error('Blocked: Invalid URL or Private IP (SSRF Protection)');
    }

    const res = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIChat-Signature': signature,
        'X-AIChat-Timestamp': String(timestamp)
      },
      body,
      redirect: 'error' // Do not follow redirects to prevent open redirect SSRF bypass
    });

    const text = await res.text();

    let responseBody: unknown = null;
    if (text) {
      try {
        responseBody = JSON.parse(text);
      } catch {
        responseBody = text;
      }
    }

    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: res.ok ? 'success' : 'failed',
        statusCode: res.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        responseBody: toJsonValue(responseBody) as any,
        error: res.ok ? null : `HTTP ${res.status}`
      }
    });
  } catch (err) {
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: 'failed',
        error: (err as Error).message
      }
    });
  }
}

export async function processWebhooksBatch(limit = 50) {
  const pending = await prisma.webhookDelivery.findMany({
    where: { status: 'pending' },
    take: limit,
    include: {
      webhook: true,
      event: true
    }
  });

  for (const d of pending) {
    await dispatchDelivery(d.id);
  }

  return pending.length;
}
