import useSWR from 'swr';
import { useAuth } from '../../auth/AuthContext';
import { fetcher } from './utils';
import { ConversationListItem, ConversationDetails, ConversationUsageSummary, ConversationListResponse } from '../../api/conversations';

export function useConversations(orgId?: string | null) {
  const { token } = useAuth();

  // If orgId is provided, use the org-specific endpoint
  // orgId sağlanmışsa, org'a özgü endpoint'i kullan
  const key = token
    ? (orgId ? [`/orgs/${orgId}/conversations`, token] : ['/conversations', token])
    : null;

  const { data, error, isLoading, mutate } = useSWR<
    { conversations: ConversationListItem[] } | ConversationListResponse
  >(key, fetcher);

  const conversations = data
    ? ('conversations' in data ? data.conversations : (data as ConversationListResponse).items)
    : [];

  return {
    conversations,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useConversation(id: string | null) {
  const { token } = useAuth();

  const { data: conversationData, error: conversationError, isLoading: conversationLoading, mutate: mutateConversation } = useSWR<{ conversation: ConversationDetails }>(
    token && id ? [`/conversations/${id}`, token] : null,
    fetcher
  );

  const { data: usageData, error: usageError, isLoading: usageLoading } = useSWR<ConversationUsageSummary>(
    token && id ? [`/conversations/${id}/usage`, token] : null,
    fetcher
  );

  return {
    conversation: conversationData?.conversation,
    usage: usageData,
    isLoading: conversationLoading || usageLoading,
    isError: conversationError || usageError,
    mutate: mutateConversation,
  };
}
