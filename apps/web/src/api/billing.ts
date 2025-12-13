// apps/web/src/api/billing.ts

import { apiRequest } from './client';

export interface BillingPlanDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  currency: string;
  monthlyPriceMinor: number;
  yearlyPriceMinor: number;
  limits: Record<string, any>;
}

export interface OrgSubscriptionDto {
  id: string;
  orgId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: BillingPlanDto;
}

export async function fetchBillingPlans(token: string): Promise<{ plans: BillingPlanDto[] }> {
  return apiRequest<{ plans: BillingPlanDto[] }>('/billing/plans', { method: 'GET' }, token);
}

export async function fetchOrgSubscription(
  token: string,
  orgId: string
): Promise<{ subscription: OrgSubscriptionDto | null }> {
  return apiRequest<{ subscription: OrgSubscriptionDto | null }>(
    `/orgs/${orgId}/billing`,
    { method: 'GET' },
    token
  );
}

export async function requestPlanChange(
  token: string,
  orgId: string,
  planId: string
): Promise<{ checkoutToken: string; merchantOid: string }> {
  return apiRequest<{ checkoutToken: string; merchantOid: string }>(
    `/orgs/${orgId}/billing/change-plan`,
    {
      method: 'POST',
      body: JSON.stringify({ planId })
    },
    token
  );
}
