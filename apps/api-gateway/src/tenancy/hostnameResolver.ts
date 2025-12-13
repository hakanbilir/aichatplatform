// apps/api-gateway/src/tenancy/hostnameResolver.ts

import { prisma } from '@ai-chat/db';

export interface HostnameTenantContext {
  orgId: string | null;
  orgSlug?: string | null;
  branding?: {
    displayName?: string | null;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    backgroundGradient?: string | null;
    fontFamily?: string | null;
  } | null;
}

/**
 * Resolve tenant context from hostname (47.md)
 * Hostname'den tenant context'ini çözümle (47.md)
 */
export async function resolveTenantByHostname(hostname: string): Promise<HostnameTenantContext> {
  // First, try to find a custom domain
  // Önce özel bir domain bulmayı dene
  const domain = await prisma.orgDomain.findFirst({
    where: {
      hostname,
      isVerified: true
    },
    include: {
      org: {
        include: {
          brandingConfig: true
        }
      }
    }
  });

  if (domain && domain.org) {
    return {
      orgId: domain.org.id,
      orgSlug: domain.org.slug,
      branding: domain.org.brandingConfig ? {
        displayName: domain.org.brandingConfig.displayName,
        logoUrl: domain.org.brandingConfig.logoUrl,
        faviconUrl: domain.org.brandingConfig.faviconUrl,
        primaryColor: domain.org.brandingConfig.primaryColor,
        secondaryColor: domain.org.brandingConfig.secondaryColor,
        backgroundGradient: domain.org.brandingConfig.backgroundGradient,
        fontFamily: domain.org.brandingConfig.fontFamily
      } : null
    };
  }

  // Fallback: try to match by slug if hostname matches pattern like "org-slug.yourdomain.com"
  // Yedek: hostname "org-slug.yourdomain.com" gibi bir desenle eşleşirse slug ile eşleştirmeyi dene
  const slugMatch = hostname.match(/^([a-z0-9-]+)\./);
  if (slugMatch) {
    const org = await prisma.organization.findUnique({
      where: { slug: slugMatch[1] },
      include: {
        brandingConfig: true
      }
    });
    if (org) {
      return {
        orgId: org.id,
        orgSlug: org.slug,
        branding: org.brandingConfig ? {
          displayName: org.brandingConfig.displayName,
          logoUrl: org.brandingConfig.logoUrl,
          faviconUrl: org.brandingConfig.faviconUrl,
          primaryColor: org.brandingConfig.primaryColor,
          secondaryColor: org.brandingConfig.secondaryColor,
          backgroundGradient: org.brandingConfig.backgroundGradient,
          fontFamily: org.brandingConfig.fontFamily
        } : null
      };
    }
  }

  return {
    orgId: null,
    orgSlug: null,
    branding: null
  };
}

// Legacy function for backward compatibility
// Geriye dönük uyumluluk için eski fonksiyon
export async function resolveOrgFromHostname(hostname: string): Promise<string | null> {
  const tenant = await resolveTenantByHostname(hostname);
  return tenant.orgId;
}
