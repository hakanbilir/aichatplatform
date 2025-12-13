// apps/web/src/api/orgBranding.ts

import { apiRequest } from './client';

export interface OrgBrandingConfigDto {
  id: string;
  orgId: string;
  displayName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  backgroundGradient: string | null;
  fontFamily: string | null;
  themeTokens: Record<string, any> | null;
  hideGlobalBranding: boolean;
  footerText: string | null;
  footerLinks: Array<{ label: string; url: string }> | null;
  showLogoOnChat: boolean;
}

export async function fetchOrgBranding(
  token: string,
  orgId: string
): Promise<{ config: OrgBrandingConfigDto | null }> {
  return apiRequest<{ config: OrgBrandingConfigDto | null }>(
    `/orgs/${orgId}/branding`,
    { method: 'GET' },
    token
  );
}

export async function updateOrgBranding(
  token: string,
  orgId: string,
  data: Partial<OrgBrandingConfigDto>
): Promise<{ config: OrgBrandingConfigDto }> {
  return apiRequest<{ config: OrgBrandingConfigDto }>(
    `/orgs/${orgId}/branding`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    },
    token
  );
}

export interface OrgDomainDto {
  id: string;
  orgId: string;
  hostname: string;
  isVerified: boolean;
  isPrimary: boolean;
  notes: string | null;
}

export async function fetchOrgDomains(
  token: string,
  orgId: string
): Promise<{ domains: OrgDomainDto[] }> {
  return apiRequest<{ domains: OrgDomainDto[] }>(
    `/orgs/${orgId}/branding/domains`,
    { method: 'GET' },
    token
  );
}

export async function createOrgDomain(
  token: string,
  orgId: string,
  hostname: string
): Promise<{ domain: OrgDomainDto }> {
  return apiRequest<{ domain: OrgDomainDto }>(
    `/orgs/${orgId}/branding/domains`,
    {
      method: 'POST',
      body: JSON.stringify({ hostname })
    },
    token
  );
}

export async function deleteOrgDomain(
  token: string,
  orgId: string,
  domainId: string
): Promise<void> {
  await apiRequest<{ ok: boolean }>(
    `/orgs/${orgId}/branding/domains/${domainId}`,
    { method: 'DELETE' },
    token
  );
}

