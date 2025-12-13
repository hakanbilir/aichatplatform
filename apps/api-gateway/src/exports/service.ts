// apps/api-gateway/src/exports/service.ts

import { prisma } from '@ai-chat/db';
import { CreateExportRequest } from './types';

export async function createConversationExportJob(payload: CreateExportRequest) {
  const job = await prisma.conversationExport.create({
    data: {
      orgId: payload.orgId,
      userId: payload.requestedBy,
      conversationId: payload.conversationId,
      format: payload.format,
      status: 'pending'
    }
  });

  // Optionally emit an event for observability (see 38.md)
  // await emitEvent({ ... });

  return job;
}

