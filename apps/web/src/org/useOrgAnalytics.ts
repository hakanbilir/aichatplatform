// apps/web/src/org/useOrgAnalytics.ts

import { useEffect, useState } from 'react';

import { useAuth } from '../auth/AuthContext';
import { OrgAnalyticsResult, streamOrgAnalytics } from '../api/orgAnalytics';

export function useOrgAnalytics(orgId: string | null, initialWindowDays = 30) {
  const { token } = useAuth();

  const [windowDays, setWindowDays] = useState(initialWindowDays);
  const [data, setData] = useState<OrgAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orgId) return;

    const controller = new AbortController();
    let isMounted = true;

    async function load() {
      if (!token || !orgId) return;
      const currentOrgId = orgId;
      setLoading(true);
      setError(null);

      try {
        await streamOrgAnalytics(
          token,
          currentOrgId,
          windowDays,
          (result) => {
            if (isMounted) setData(result);
          },
          (err) => {
            if (isMounted) setError(err.message || 'Failed to stream analytics');
          },
          controller.signal
        );
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message || 'Failed to initiate stream');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      isMounted = false;
      controller.abort();
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





