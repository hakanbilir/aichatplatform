// apps/api-gateway/src/events/emitter.ts

import { prisma } from '@ai-chat/db';

import { EmitEventParams } from './types';
import { localEmitter } from './localEmitter';

function matchesEventType(eventType: string, pattern: string): boolean {
  // simple prefix match: "conversation." matches "conversation.message_sent"
  return eventType === pattern || eventType.startsWith(pattern);
}

export async function emitEvent(params: EmitEventParams): Promise<void> {
  const { type, context, metadata } = params;

  const event = await prisma.event.create({
    data: {
      orgId: context.orgId,
      userId: context.userId ?? null,
      type,
      conversationId: context.conversationId ?? null,
      messageId: context.messageId ?? null,
      metadata: metadata ?? {}
    }
  });

  // Broadcast to local listeners (e.g., SSE)
  localEmitter.emit('event', {
    ...params,
    eventId: event.id,
    createdAt: event.createdAt
  });

  // Find matching webhook subscriptions and enqueue deliveries
  const webhooks = await prisma.webhookSubscription.findMany({
    where: {
      orgIntegration: {
        orgId: context.orgId,
        isEnabled: true
      },
      isActive: true
    }
  });

  if (webhooks.length === 0) return;

  const deliveriesData = webhooks
    .filter((wh: { eventTypes: unknown }) => {
      const types = (wh.eventTypes as string[]) || [];
      return types.length === 0 || types.some((pattern: string) => matchesEventType(type, pattern));
    })
    .map((wh: { id: string }) => ({
      webhookId: wh.id,
      eventId: event.id,
      status: 'pending' as const,
      requestBody: {
        id: event.id,
        type: event.type,
        createdAt: event.createdAt.toISOString(),
        orgId: event.orgId,
        userId: event.userId,
        conversationId: event.conversationId,
        messageId: event.messageId,
        metadata: event.metadata
      } as any
    }));

  if (deliveriesData.length > 0) {
    await prisma.webhookDelivery.createMany({ data: deliveriesData });
  }
}

