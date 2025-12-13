// apps/web/src/integrations/useWebhooks.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  Webhook,
  CreateWebhookInput,
  fetchWebhooks,
  createWebhookApi,
  updateWebhookApi,
  deleteWebhookApi
} from '../api/webhooks';

export function useWebhooks(orgId: string | null) {
  const { token } = useAuth();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;

    async function load() {
      if (!token || !orgId) return; // Type guard / Tip koruması
      const currentOrgId = orgId; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const data = await fetchWebhooks(token, currentOrgId);
        if (!cancelled) setWebhooks(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load webhooks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  async function create(input: CreateWebhookInput) {
    if (!token || !orgId) return;
    const created = await createWebhookApi(token, orgId, input);
    setWebhooks((prev) => [...prev, created]);
  }

  async function update(id: string, data: Partial<CreateWebhookInput & { isEnabled: boolean }>) {
    if (!token || !orgId) return;
    await updateWebhookApi(token, orgId, id, data);
    const fresh = await fetchWebhooks(token, orgId);
    setWebhooks(fresh);
  }

  async function remove(id: string) {
    if (!token || !orgId) return;
    await deleteWebhookApi(token, orgId, id);
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  }

  return {
    webhooks,
    loading,
    error,
    create,
    update,
    remove
  };
}

