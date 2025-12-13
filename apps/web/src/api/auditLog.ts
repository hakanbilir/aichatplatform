// apps/web/src/api/auditLog.ts

import { apiRequest } from './client';

export interface AuditEventUser {
  id: string;
  email: string;
  displayName: string;
}

export interface AuditEvent {
  id: string;
  createdAt: string;
  type: string;
  user: AuditEventUser | null;
  conversationId?: string | null;
  messageId?: string | null;
  metadata: Record<string, any>;
}

export interface AuditLogResponse {
  total: number;
  page: number;
  pageSize: number;
  events: AuditEvent[];
}

export interface AuditLogQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  userId?: string;
  conversationId?: string;
}

export async function fetchAuditLog(
  token: string,
  orgId: string,
  query: AuditLogQuery
): Promise<AuditLogResponse> {
  const params = new URLSearchParams();

  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
  if (query.type) params.set('type', query.type);
  if (query.userId) params.set('userId', query.userId);
  if (query.conversationId) params.set('conversationId', query.conversationId);

  return apiRequest<AuditLogResponse>(
    `/orgs/${orgId}/audit-log?${params.toString()}`,
    { method: 'GET' },
    token
  );
}

