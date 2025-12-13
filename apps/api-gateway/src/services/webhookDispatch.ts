// apps/api-gateway/src/services/webhookDispatch.ts

import crypto from 'crypto';
import { prisma } from '@ai-chat/db';
import { logger } from '../observability/logger';

export type WebhookEventType = 'chat.turn.completed' | 'tool.exec.success' | 'tool.exec.error';

export interface WebhookEventPayload {
  type: WebhookEventType;
  orgId: string;
  conversationId?: string;
  data: any;
}

// computeSignature reserved for future webhook signature verification
// @ts-ignore - intentionally unused, reserved for future use
function _computeSignature(secret: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex');
}
void _computeSignature; // Suppress unused function warning

export async function dispatchWebhookEvent(event: WebhookEventPayload): Promise<void> {
  if (!event.orgId) {
    return; // Skip if no org context
  }

  const subscriptions = await prisma.webhookSubscription.findMany({
    where: {
      isActive: true,
      orgIntegration: {
        orgId: event.orgId,
        isEnabled: true,
      },
    },
    include: {
      orgIntegration: true,
    },
  });

  if (!subscriptions.length) return;

  const body = JSON.stringify(event);

  for (const sub of subscriptions) {
    const eventTypes = (sub.eventTypes as string[]) || [];
    if (!eventTypes.includes(event.type)) {
      continue; // Skip if this subscription doesn't listen to this event type
    }

    const startedAt = Date.now();
    let success = false;
    let statusCode: number | null = null;
    let error: string | null = null;

    try {
      // Use HMAC signature with timestamp (38.md)
      // Zaman damgası ile HMAC imzası kullan (38.md)
      const timestamp = Math.floor(Date.now() / 1000);
      const toSign = `${timestamp}.${body}`;
      const signature = crypto.createHmac('sha256', sub.secret).update(toSign).digest('hex');

      const res = await fetch(sub.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AIChat-Signature': signature,
          'X-AIChat-Timestamp': String(timestamp),
          'X-AIChat-Event': event.type,
        },
        body,
      });

      statusCode = res.status;
      success = res.ok;

      if (!res.ok) {
        error = `HTTP ${res.status}`;
      }
    } catch (err) {
      error = (err as Error).message;
    } finally {
      const durationMs = Date.now() - startedAt;

      await prisma.webhookDeliveryLog.create({
        data: {
          subscriptionId: sub.id,
          statusCode: statusCode ?? 0,
          durationMs,
          success,
          error,
        },
      });

      logger.info(
        {
          event: 'webhook.delivery',
          subscriptionId: sub.id,
          orgId: event.orgId,
          url: sub.url,
          statusCode,
          durationMs,
          success,
          error,
        },
        'Webhook delivery completed',
      );
    }
  }
}

