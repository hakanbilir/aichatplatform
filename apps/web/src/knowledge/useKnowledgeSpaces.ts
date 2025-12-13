// apps/web/src/knowledge/useKnowledgeSpaces.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { KnowledgeSpace, fetchKnowledgeSpaces, createKnowledgeSpace } from '../api/knowledge';

export function useKnowledgeSpaces(orgId: string | null) {
  const { token } = useAuth();
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([]);
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
        const data = await fetchKnowledgeSpaces(token, currentOrgId);
        if (!cancelled) setSpaces(data);
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load spaces');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  async function createSpace(name: string) {
    if (!token || !orgId) return;
    const res = await createKnowledgeSpace(token, orgId, name);
    // Reload spaces after creation
    const data = await fetchKnowledgeSpaces(token, orgId);
    setSpaces(data);
    return res.id;
  }

  return {
    spaces,
    loading,
    error,
    createSpace
  };
}

