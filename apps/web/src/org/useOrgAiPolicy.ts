// apps/web/src/org/useOrgAiPolicy.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { OrgAiPolicy, OrgAiPolicyConfig, fetchOrgAiPolicy, saveOrgAiPolicy } from '../api/orgAiPolicy';

export function useOrgAiPolicy(orgId: string | null) {
  const { token } = useAuth();
  const [policy, setPolicy] = useState<OrgAiPolicy | null>(null);
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
        const data = await fetchOrgAiPolicy(token, currentOrgId);
        if (!cancelled) {
          setPolicy(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Failed to load AI policy');
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

  async function save(input: {
    name: string;
    description?: string;
    systemPrompt: string;
    config?: OrgAiPolicyConfig;
  }) {
    if (!token || !orgId) return;
    const updated = await saveOrgAiPolicy(token, orgId, input);
    setPolicy(updated);
  }

  return {
    policy,
    loading,
    error,
    save
  };
}

