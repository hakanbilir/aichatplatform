import useSWR from 'swr';
import { useAuth } from '../../auth/AuthContext';
import { fetcher } from './utils';
import { ModelRegistryEntryDto } from '../../api/modelRegistry';

export function useModels(orgId: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ models: ModelRegistryEntryDto[] }>(
    token && orgId ? [`/orgs/${orgId}/models`, token] : null,
    fetcher
  );

  return {
    models: data?.models || [],
    isLoading,
    isError: error,
    mutate,
  };
}
