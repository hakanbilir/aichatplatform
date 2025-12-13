// apps/web/src/audit/useAuditLog.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AuditEvent, AuditLogResponse, AuditLogQuery, fetchAuditLog } from '../api/auditLog';

export function useAuditLog(orgId: string | null, initialQuery: AuditLogQuery = {}) {
  const { token } = useAuth();

  const [query, setQuery] = useState<AuditLogQuery>({ page: 0, pageSize: 25, ...initialQuery });
  const [response, setResponse] = useState<AuditLogResponse | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;
    const currentToken = token; // Capture for closure / Kapanış için yakala
    const currentOrgId = orgId; // Capture for closure / Kapanış için yakala

    async function load() {
      if (!currentToken || !currentOrgId) return; // Type guard / Tip koruması
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAuditLog(currentToken, currentOrgId, query);
        if (!cancelled) {
          setResponse(res);
          setEvents(res.events);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Failed to load audit log');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, orgId, query]);

  return {
    query,
    setQuery,
    response,
    events,
    loading,
    error
  };
}

