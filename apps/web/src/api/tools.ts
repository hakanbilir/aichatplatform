// apps/web/src/api/tools.ts

import { apiRequest } from './client';

export interface ToolDescription {
  name: string;
  description: string;
  argsSchema: any;
}

export interface ListToolsResponse {
  tools: ToolDescription[];
}

export interface ToolExecutionResult {
  tool: string;
  ok: boolean;
  result?: unknown;
  error?: string;
}

export interface ExecuteToolResponse extends ToolExecutionResult {}

export interface ExecuteEnvelopeResponse {
  results: ToolExecutionResult[];
}

export async function listTools(
  token: string,
  params: { conversationId?: string | null; orgId?: string | null } = {},
): Promise<ListToolsResponse> {
  const searchParams = new URLSearchParams();

  if (params.conversationId) {
    searchParams.set('conversationId', params.conversationId);
  }
  if (params.orgId) {
    searchParams.set('orgId', params.orgId);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';

  return apiRequest<ListToolsResponse>(`/tools${suffix}`, { method: 'GET' }, token);
}

export async function executeTool(
  token: string,
  payload: {
    conversationId?: string | null;
    orgId?: string | null;
    tool: string;
    args?: unknown;
  },
): Promise<ExecuteToolResponse> {
  return apiRequest<ExecuteToolResponse>(
    '/tools/execute',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function executeToolEnvelope(
  token: string,
  payload: {
    conversationId?: string | null;
    orgId?: string | null;
    toolCalls: { tool: string; args?: unknown }[];
  },
): Promise<ExecuteEnvelopeResponse> {
  return apiRequest<ExecuteEnvelopeResponse>(
    '/tools/execute-envelope',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
    token,
  );
}

