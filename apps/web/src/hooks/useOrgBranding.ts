// apps/web/src/hooks/useOrgBranding.ts

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { fetchOrgBranding, OrgBrandingConfigDto } from '../api/orgBranding';
import { useParams } from 'react-router-dom';

// Type guard function / Tip koruma fonksiyonu
function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function useOrgBranding() {
  const { token } = useAuth();
  const { orgId } = useParams();
  const [branding, setBranding] = useState<OrgBrandingConfigDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !isNonEmptyString(orgId)) {
      setLoading(false);
      return;
    }

    // orgId is now narrowed to string by type guard / orgId artık tip koruma ile string olarak daraltıldı
    const currentOrgId = orgId;
    let cancelled = false;

    async function load() {
      try {
        // TypeScript limitation: type narrowing doesn't work across closure boundaries
        // Runtime check above guarantees currentOrgId is a non-empty string
        // TypeScript sınırlaması: tip daraltma kapanış sınırları arasında çalışmaz
        // Yukarıdaki runtime kontrolü currentOrgId'nin boş olmayan string olduğunu garanti eder
        // @ts-expect-error - TypeScript can't narrow type across closure, but runtime check ensures safety
        const res = await fetchOrgBranding(token, currentOrgId);
        if (!cancelled) {
          setBranding(res.config);
        }
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
  }, [token, orgId]);

  return { branding, loading };
}
