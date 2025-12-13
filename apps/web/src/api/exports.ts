// apps/web/src/api/exports.ts

import { apiRequest } from './client';

export type ConversationExportFormat = 'jsonl' | 'markdown' | 'html';

export interface ExportJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  format: ConversationExportFormat;
  fileUrl: string | null;
  metadata: Record<string, any>;
}

export async function createExportJob(
  token: string,
  orgId: string,
  conversationId: string,
  format: ConversationExportFormat
): Promise<{ exportId: string; status: string }> {
  return apiRequest<{ exportId: string; status: string }>(
    `/orgs/${orgId}/conversations/${conversationId}/export`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ format })
    },
    token
  );
}

export async function fetchExportJob(
  token: string,
  orgId: string,
  exportId: string
): Promise<ExportJob> {
  return apiRequest<ExportJob>(
    `/orgs/${orgId}/exports/${exportId}`,
    { method: 'GET' },
    token
  );
}

