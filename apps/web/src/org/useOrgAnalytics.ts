// apps/web/src/org/useOrgAnalytics.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { OrgAnalyticsResult, fetchOrgAnalytics } from '../api/orgAnalytics';

export function useOrgAnalytics(orgId: string | null, initialWindowDays = 30) {
  const { token } = useAuth();

  const [windowDays, setWindowDays] = useState(initialWindowDays);
  const [data, setData] = useState<OrgAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;

    async function load() {
      if (!token || !orgId) return; // Type guard / Tip koruması
      const currentOrgId = orgId; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOrgAnalytics(token, currentOrgId, windowDays);
        if (cancelled) return;
        setData(res);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Failed to load analytics');
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
  }, [token, orgId, windowDays]);

  return {
    data,
    loading,
    error,
    windowDays,
    setWindowDays
  };
}





