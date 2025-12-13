// apps/web/src/knowledge/useKnowledgeSearch.ts

import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { RetrievedChunk, retrieveKnowledgeChunks } from '../api/knowledge';

export function useKnowledgeSearch(orgId: string | null) {
  const { token } = useAuth();
  const [query, setQuery] = useState('');
  const [spaceId, setSpaceId] = useState<string | undefined>(undefined);
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(limit = 8) {
    if (!token || !orgId || !query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const chunks = await retrieveKnowledgeChunks(token, orgId, {
        spaceId,
        query,
        limit
      });
      setResults(chunks);
    } catch (err) {
      setError((err as Error).message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    spaceId,
    setSpaceId,
    results,
    loading,
    error,
    search
  };
}

