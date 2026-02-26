// apps/web/src/prompts/usePromptTemplates.ts

import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../auth/AuthContext';
import {
  PromptTemplate,
  CreatePromptTemplateInput,
  createPromptTemplateApi,
  createPromptTemplateVersion,
  deletePromptTemplateApi,
  fetchPromptTemplates,
  updatePromptTemplateApi,
} from '../api/prompts';

export function usePromptTemplates(orgId: string | null) {
  const { token } = useAuth();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;

    async function load() {
      if (!token || !orgId) return; // Type guard / Tip koruması
      const currentToken = token; // Capture for closure / Kapanış için yakala
      const currentOrgId = orgId; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPromptTemplates(currentToken, currentOrgId);
        if (!cancelled) {
          setTemplates(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'Failed to load prompts');
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

  const createTemplate = useCallback(
    async (input: CreatePromptTemplateInput) => {
      if (!token || !orgId) return;
      const created = await createPromptTemplateApi(token, orgId, input);
      setTemplates((prev) => [...prev, created]);
    },
    [token, orgId],
  );

  const updateTemplate = useCallback(
    async (templateId: string, data: Partial<CreatePromptTemplateInput>) => {
      if (!token || !orgId) return;

      // 1. Update metadata (name, description)
      if (data.name || data.description) {
        await updatePromptTemplateApi(token, orgId, templateId, {
          name: data.name,
          description: data.description,
        });
      }

      // 2. Create new version if content changed (systemPrompt)
      if (data.systemPrompt) {
        await createPromptTemplateVersion(token, orgId, templateId, {
          systemPrompt: data.systemPrompt,
          variables: data.variables,
          userPrefix: data.userPrefix,
          assistantStyle: data.assistantStyle,
        });
      }

      const next = await fetchPromptTemplates(token, orgId);
      setTemplates(next);
    },
    [token, orgId],
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      if (!token || !orgId) return;
      await deletePromptTemplateApi(token, orgId, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    },
    [token, orgId],
  );

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
