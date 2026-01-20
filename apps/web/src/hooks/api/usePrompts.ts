import useSWR from 'swr';
import { useAuth } from '../../auth/AuthContext';
import { fetcher } from './utils';
import {
  PromptTemplate,
  CreatePromptTemplateInput,
  createPromptTemplateApi,
  updatePromptTemplateApi,
  deletePromptTemplateApi
} from '../../api/prompts';

export function usePrompts(orgId: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ templates: PromptTemplate[] }>(
    token && orgId ? [`/orgs/${orgId}/prompts`, token] : null,
    fetcher
  );

  const createTemplate = async (input: CreatePromptTemplateInput) => {
    if (!token || !orgId) throw new Error('No auth');
    const newTemplate = await createPromptTemplateApi(token, orgId, input);
    await mutate(); // Revalidate
    return newTemplate;
  };

  const updateTemplate = async (id: string, input: Partial<CreatePromptTemplateInput>) => {
    if (!token || !orgId) throw new Error('No auth');
    await updatePromptTemplateApi(token, orgId, id, input);
    await mutate();
  };

  const deleteTemplate = async (id: string) => {
    if (!token || !orgId) throw new Error('No auth');
    await deletePromptTemplateApi(token, orgId, id);
    await mutate();
  };

  return {
    templates: data?.templates || [],
    isLoading,
    isError: error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    mutate
  };
}
