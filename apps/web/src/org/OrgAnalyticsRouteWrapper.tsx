// apps/web/src/org/OrgAnalyticsRouteWrapper.tsx

import React from 'react';
import { useParams } from 'react-router-dom';
import { OrgAnalyticsPage } from './OrgAnalyticsPage';

export const OrgAnalyticsRouteWrapper: React.FC = () => {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  if (!orgId) {
    return <div>Missing orgId</div>;
  }

  return <OrgAnalyticsPage orgId={orgId} />;
};





