// apps/web/src/api/webhooks.ts

import { apiRequest } from './client';

export interface Webhook {
  id: string;
  orgId: string;
  name?: string;
  description?: string | null;
  url: string;
  eventTypes: string[];
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookInput {
  name: string;
  description?: string;
  url: string;
  eventTypes?: string[];
}

export async function fetchWebhooks(token: string, orgId: string): Promise<Webhook[]> {
  const res = await apiRequest<{ webhooks: Webhook[] }>(
    `/orgs/${orgId}/webhooks`,
    { method: 'GET' },
    token
  );
  return res.webhooks;
}

export async function createWebhookApi(
  token: string,
  orgId: string,
  input: CreateWebhookInput
): Promise<Webhook> {
  const res = await apiRequest<{ webhook: Webhook }>(
    `/orgs/${orgId}/webhooks`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    },
    token
  );
  return res.webhook;
}

export async function updateWebhookApi(
  token: string,
  orgId: string,
  webhookId: string,
  data: Partial<CreateWebhookInput & { isEnabled: boolean }>
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/webhooks/${webhookId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    token
  );
}

export async function deleteWebhookApi(
  token: string,
  orgId: string,
  webhookId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/webhooks/${webhookId}`,
    { method: 'DELETE' },
    token
  );
}

