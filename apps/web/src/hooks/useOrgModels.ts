import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthContext';
import { fetchOrgModels, upsertOrgModel } from '../api/modelRegistry';

export function useOrgModels(orgId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['org-models', orgId],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return fetchOrgModels(token, orgId);
    },
    enabled: !!token && !!orgId,
  });
}

export function useUpsertOrgModel(orgId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (model: {
      provider: string;
      modelName: string;
      displayName: string;
      description?: string;
      isEnabled?: boolean;
      isDefault?: boolean;
      capabilities?: string[];
      contextWindow?: number;
      maxOutputTokens?: number;
      inputPriceMicros?: number;
      outputPriceMicros?: number;
      metadata?: Record<string, any>;
    }) => {
      if (!token) throw new Error('No token');
      return upsertOrgModel(token, orgId, model);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-models', orgId] });
    },
  });
}
