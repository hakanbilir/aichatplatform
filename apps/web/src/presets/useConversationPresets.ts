// apps/web/src/presets/useConversationPresets.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  ConversationPreset,
  CreateConversationPresetInput,
  createConversationPresetApi,
  deleteConversationPresetApi,
  fetchConversationPresets,
  updateConversationPresetApi
} from '../api/presets';

export function useConversationPresets(orgId: string | null) {
  const { token } = useAuth();
  const [presets, setPresets] = useState<ConversationPreset[]>([]);
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
        const data = await fetchConversationPresets(token, currentOrgId);
        if (!cancelled) {
          setPresets(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Failed to load presets');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  async function createPreset(input: CreateConversationPresetInput) {
    if (!token || !orgId) return;
    const created = await createConversationPresetApi(token, orgId, input);
    setPresets((prev) => [...prev, created]);
  }

  async function updatePreset(presetId: string, data: Partial<CreateConversationPresetInput>) {
    if (!token || !orgId) return;
    await updateConversationPresetApi(token, orgId, presetId, data);
    const next = await fetchConversationPresets(token, orgId);
    setPresets(next);
  }

  async function deletePreset(presetId: string) {
    if (!token || !orgId) return;
    await deleteConversationPresetApi(token, orgId, presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }

  return {
    presets,
    loading,
    error,
    createPreset,
    updatePreset,
    deletePreset
  };
}

