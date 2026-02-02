import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import {
  fetchPromptTemplates,
  fetchPromptTemplateDetail,
  createPromptTemplateApi,
  updatePromptTemplateApi,
  deletePromptTemplateApi,
  createPromptTemplateVersion,
  CreatePromptTemplateInput,
  PromptVariable
} from '../api/prompts';

export function usePromptTemplates(orgId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['prompt-templates', orgId],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return fetchPromptTemplates(token, orgId);
    },
    enabled: !!token && !!orgId,
  });
}

export function usePromptTemplate(orgId: string, templateId: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['prompt-template', orgId, templateId],
    queryFn: () => {
      if (!token) throw new Error('No token');
      return fetchPromptTemplateDetail(token, orgId, templateId);
    },
    enabled: !!token && !!orgId && !!templateId,
  });
}

export function useCreatePromptTemplate(orgId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePromptTemplateInput) => {
      if (!token) throw new Error('No token');
      return createPromptTemplateApi(token, orgId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates', orgId] });
    },
  });
}

export function useUpdatePromptTemplate(orgId: string, templateId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { description?: string; isArchived?: boolean }) => {
      if (!token) throw new Error('No token');
      return updatePromptTemplateApi(token, orgId, templateId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates', orgId] });
      queryClient.invalidateQueries({ queryKey: ['prompt-template', orgId, templateId] });
    },
  });
}

export function useDeletePromptTemplate(orgId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => {
      if (!token) throw new Error('No token');
      return deletePromptTemplateApi(token, orgId, templateId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-templates', orgId] });
    },
  });
}

export function useCreatePromptTemplateVersion(orgId: string, templateId: string) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      systemPrompt: string;
      userPrefix?: string;
      assistantStyle?: string;
      variables?: Record<string, PromptVariable>;
      metadata?: Record<string, any>;
    }) => {
      if (!token) throw new Error('No token');
      return createPromptTemplateVersion(token, orgId, templateId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt-template', orgId, templateId] });
    },
  });
}
