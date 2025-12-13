// apps/api-gateway/src/exports/types.ts

import { ConversationExportFormat } from '@ai-chat/core-types';

// Re-export for backward compatibility
// Geriye dönük uyumluluk için yeniden dışa aktar
export type { ConversationExportFormat };

export interface CreateExportRequest {
  orgId: string;
  requestedBy: string;
  conversationId: string;
  format: ConversationExportFormat;
}

export interface ExportJobResultMetadata {
  conversationId: string;
  format: ConversationExportFormat;
  messageCount: number;
  sizeBytes: number;
}

