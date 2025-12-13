// apps/web/src/prompts/usePromptTemplates.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  PromptTemplate,
  CreatePromptTemplateInput,
  createPromptTemplateApi,
  deletePromptTemplateApi,
  fetchPromptTemplates,
  updatePromptTemplateApi
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

  async function createTemplate(input: CreatePromptTemplateInput) {
    if (!token || !orgId) return;
    const created = await createPromptTemplateApi(token, orgId, input);
    setTemplates((prev) => [...prev, created]);
  }

  async function updateTemplate(templateId: string, data: Partial<CreatePromptTemplateInput>) {
    if (!token || !orgId) return;
    await updatePromptTemplateApi(token, orgId, templateId, data);
    const next = await fetchPromptTemplates(token, orgId);
    setTemplates(next);
  }

  async function deleteTemplate(templateId: string) {
    if (!token || !orgId) return;
    await deletePromptTemplateApi(token, orgId, templateId);
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  }

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate
  };
}

