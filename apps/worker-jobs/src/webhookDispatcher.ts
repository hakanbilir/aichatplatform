// apps/worker-jobs/src/webhookDispatcher.ts

import crypto from 'node:crypto';
import { prisma } from '@ai-chat/db';

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
    const res = await fetch(delivery.webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIChat-Signature': signature,
        'X-AIChat-Timestamp': String(timestamp)
      },
      body
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
        responseBody: responseBody as any,
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

