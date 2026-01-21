import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchOrgModels, ModelRegistryEntryDto } from '../api/modelRegistry';

export function useModels(orgId?: string | null) {
  const { token, activeOrg } = useAuth();
  const [models, setModels] = useState<ModelRegistryEntryDto[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const targetOrgId = orgId || activeOrg?.id;

  const refresh = useCallback(async () => {
    if (!token || !targetOrgId) {
       setModels([]);
       return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrgModels(token, targetOrgId);
      // Sort models by displayName or modelName for better UX
      const sorted = data.models.sort((a, b) =>
        (a.displayName || a.modelName).localeCompare(b.displayName || b.modelName)
      );
      setModels(sorted);
    } catch (err) {
      setError((err as Error).message || 'Failed to load models');
    } finally {
      setLoading(false);
    }
  }, [token, targetOrgId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { models, loading, error, refresh };
}
