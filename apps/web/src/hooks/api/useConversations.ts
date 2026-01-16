import useSWR from 'swr';
import { useAuth } from '../../auth/AuthContext';
import { apiRequest } from '../../api/client';
import { ConversationListItem } from '../../api/conversations';

export function useConversations() {
  const { token } = useAuth();

  const fetcher = (url: string) =>
    apiRequest<{ conversations: ConversationListItem[] }>(url, { method: 'GET' }, token)
      .then(res => res.conversations);

  const { data, error, isLoading, mutate } = useSWR(
    token ? '/conversations' : null,
    fetcher
  );

  return {
    conversations: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}
