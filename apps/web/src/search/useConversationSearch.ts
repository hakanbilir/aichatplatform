// apps/web/src/search/useConversationSearch.ts

import { useCallback, useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import {
  ConversationSearchFilters,
  ConversationSearchHit,
  ConversationSearchResponse,
  ConversationSearchPayload,
  searchConversationsStream,
  SearchSort
} from '../api/search';

export interface UseConversationSearchState {
  query: string;
  sort: SearchSort;
  filters: ConversationSearchFilters;
  page: number;
  pageSize: number;
}

export function useConversationSearch(orgId: string | null) {
  const { token } = useAuth();

  const [state, setState] = useState<UseConversationSearchState>({
    query: '',
    sort: 'recent',
    filters: {},
    page: 0,
    pageSize: 20
  });

  const [results, setResults] = useState<ConversationSearchResponse | null>(null);
  const [hits, setHits] = useState<ConversationSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (override?: Partial<UseConversationSearchState>) => {
      if (!token || !orgId) return;
      const nextState: UseConversationSearchState = {
        ...state,
        ...override
      };

      setState(nextState);
      setLoading(true);
      setError(null);
      setHits([]); // Clear hits before new search

      try {
        const payload: ConversationSearchPayload = {
          query: nextState.query,
          page: nextState.page,
          pageSize: nextState.pageSize,
          sort: nextState.sort,
          filters: nextState.filters
        };

        let currentHits: ConversationSearchHit[] = [];
        let meta: any = null;

        await searchConversationsStream(token, orgId, payload, (event, data) => {
          if (event === 'meta') {
            meta = data;
            setResults({
              total: data.total,
              page: data.page,
              pageSize: data.pageSize,
              hits: []
            });
          } else if (event === 'hit') {
            currentHits.push(data);
            // Update hits state incrementally for kinetic feel
            setHits([...currentHits]);
          } else if (event === 'done') {
            if (meta) {
               setResults({
                 total: meta.total,
                 page: meta.page,
                 pageSize: meta.pageSize,
                 hits: currentHits
               });
            }
          }
        });

      } catch (err) {
        console.error(err);
        setError((err as Error).message || 'Search failed');
      } finally {
        setLoading(false);
      }
    },
    [token, orgId, state]
  );

  return {
    state,
    results,
    hits,
    loading,
    error,
    runSearch,
    setState
  };
}
