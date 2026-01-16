import useSWR from 'swr';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../api/client';
import { ConversationDetails, ConversationUsageSummary } from '../../api/conversations';

export function useConversation(id: string | null) {
  const { token } = useAuth();

  const conversationFetcher = (url: string) =>
    apiRequest<{ conversation: ConversationDetails }>(url, { method: 'GET' }, token)
      .then(res => res.conversation);

  const usageFetcher = (url: string) =>
    apiRequest<ConversationUsageSummary>(url, { method: 'GET' }, token);

  const { data: conversation, error: conversationError, isLoading: conversationLoading, mutate: mutateConversation } = useSWR(
    token && id ? `/conversations/${id}` : null,
    conversationFetcher
  );

  const { data: usage, error: usageError, isLoading: usageLoading, mutate: mutateUsage } = useSWR(
    token && id ? `/conversations/${id}/usage` : null,
    usageFetcher
  );

  return {
    conversation,
    usage,
    isLoading: conversationLoading || usageLoading,
    isError: conversationError || usageError,
    mutateConversation,
    mutateUsage,
  };
}
