// apps/api-gateway/src/sso/types.ts

export type SsoType = 'saml' | 'oidc';

export interface SsoConnectionDto {
  id: string;
  orgId: string;
  type: SsoType;
  name: string;
  isEnabled: boolean;
  enableJitProvisioning: boolean;
  config: Record<string, any>;
}
