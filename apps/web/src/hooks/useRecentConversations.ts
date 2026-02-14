import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { listConversations, listOrgConversations } from '../api/conversations';

export function useRecentConversations(orgId?: string) {
  const { token } = useAuth();

  return useQuery({
    queryKey: ['recent-conversations', orgId],
    queryFn: async () => {
      if (!token) throw new Error('No token');

      if (orgId) {
        // Fetch org conversations with limit
        const res = await listOrgConversations(token, orgId, { limit: 5 });
        return res.items;
      } else {
        // Fetch personal conversations and slice locally
        const res = await listConversations(token);
        return res.conversations.slice(0, 5);
      }
    },
    enabled: !!token,
  });
}
