import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '@mergenhan/db';
import { JwtService } from '@nestjs/jwt';
import { EnterpriseService } from '../../enterprise/enterprise.service';
import { AuthService } from '../auth.service';

/**
 * SSO Service for handling SAML/OIDC authentication flows
 * Includes JIT provisioning and seat limit enforcement
 */
@Injectable()
export class SsoService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    @Inject(forwardRef(() => EnterpriseService))
    private enterpriseService: EnterpriseService,
    private authService: AuthService,
  ) {}

  /**
   * Handle SSO callback after successful authentication at IdP
   * This would be called after SAML assertion or OIDC token exchange
   */
  async handleSsoCallback(
    orgId: string,
    attributes: {
      subject: string;
      email: string;
      name?: string;
      groups?: string[];
    },
  ) {
    const ssoConfig = await this.enterpriseService.getSsoConfig(orgId);

    if (!ssoConfig || ssoConfig.status !== 'ACTIVE') {
      throw new NotFoundException('SSO not configured or inactive for this organization');
    }

    // Check allowed domains if configured
    if (ssoConfig.allowedDomains && ssoConfig.allowedDomains.length > 0) {
      const emailDomain = attributes.email.split('@')[1];
      if (!ssoConfig.allowedDomains.includes(emailDomain)) {
        throw new UnauthorizedException(`Email domain ${emailDomain} is not allowed for SSO`);
      }
    }

    // Find or create user
    let user = await this.prisma.user.findUnique({
      where: { email: attributes.email },
    });

    if (!user) {
      if (!ssoConfig.jitProvisioningEnabled) {
        throw new UnauthorizedException(
          'User not found and JIT provisioning is disabled. Contact your administrator.',
        );
      }

      // Check seat limit before creating user
      await this.enterpriseService.enforceSeatLimit(orgId, 'sso_jit');

      // Create user via JIT provisioning
      user = await this.prisma.user.create({
        data: {
          email: attributes.email,
          name: attributes.name || attributes.email.split('@')[0],
          // Note: emailVerified field doesn't exist in User model, SSO users are implicitly verified
          // Not: emailVerified alanı User modelinde yok, SSO kullanıcıları dolaylı olarak doğrulanmıştır
        },
      });
    }

    // Find or create org membership
    let membership = await this.prisma.orgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId,
        },
      },
    });

    // Map groups to roles if configured
    let roles: string[] = ['org_member']; // default role
    if (ssoConfig.groupToRoleMappings && attributes.groups) {
      const mappings = ssoConfig.groupToRoleMappings as Record<string, string>;
      roles = attributes.groups
        .map((group) => mappings[group])
        .filter((role): role is string => !!role);

      if (roles.length === 0) {
        roles = ['org_member']; // fallback to default
      }
    }

    if (!membership) {
      // Check seat limit before creating membership
      await this.enterpriseService.enforceSeatLimit(orgId, 'sso_jit');

      membership = await this.prisma.orgMembership.create({
        data: {
          userId: user.id,
          orgId,
          roles,
          isDisabled: false,
        },
      });
    } else {
      // Update existing membership with roles from groups
      membership = await this.prisma.orgMembership.update({
        where: { id: membership.id },
        data: {
          roles,
          isDisabled: false,
        },
      });
    }

    // Check if user is superadmin / Kullanıcının superadmin olup olmadığını kontrol et
    let isSuperAdmin = user.isSystemAdmin || false;

    // Also check if user has superadmin role in any org / Ayrıca kullanıcının herhangi bir org'da superadmin rolü olup olmadığını kontrol et
    if (!isSuperAdmin) {
      const superadminMembership = await this.prisma.orgMembership.findFirst({
        where: {
          userId: user.id,
          roles: {
            has: 'superadmin',
          },
          isDisabled: false,
        },
      });
      if (superadminMembership) {
        isSuperAdmin = true;
      }
    }

    // Generate JWT token / JWT token oluştur
    const payload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      orgId,
      membership: {
        roles: membership.roles,
      },
    };
  }

  /**
   * Get SSO login URL for SP-initiated login
   * For SAML: Returns IdP SSO URL with SAMLRequest
   * For OIDC: Returns authorization endpoint URL with OAuth2 parameters
   */
  async getSsoLoginUrl(
    orgSlug: string,
    returnUrl?: string,
  ): Promise<{ url: string; type: 'SAML' | 'OIDC' }> {
    const ssoConfig = await this.enterpriseService.getSsoConfigByOrgSlug(orgSlug);

    if (!ssoConfig || ssoConfig.status !== 'ACTIVE') {
      throw new NotFoundException('SSO not configured for this organization');
    }

    if (ssoConfig.protocol === 'SAML') {
      // Generate SAML AuthnRequest / SAML AuthnRequest oluştur
      if (!ssoConfig.metadataUrl && !ssoConfig.metadataXml) {
        throw new BadRequestException('SAML metadata not configured');
      }

      // Parse IdP SSO URL from metadata / Metadata'dan IdP SSO URL'sini ayrıştır
      // In production, parse metadata XML properly / Üretimde metadata XML'ini düzgün şekilde ayrıştır
      let idpSsoUrl = ssoConfig.metadataUrl || '';

      // Try to extract SSO URL from metadata XML if available / Mümkünse metadata XML'inden SSO URL'sini çıkar
      if (ssoConfig.metadataXml) {
        // Basic extraction - in production use proper XML parser / Temel çıkarma - üretimde düzgün XML ayrıştırıcı kullan
        const ssoUrlMatch = ssoConfig.metadataXml.match(
          /<SingleSignOnService[^>]*Location="([^"]+)"/i,
        );
        if (ssoUrlMatch && ssoUrlMatch[1]) {
          idpSsoUrl = ssoUrlMatch[1];
        }
      }

      if (!idpSsoUrl) {
        throw new BadRequestException('IdP SSO URL not found in metadata');
      }

      // Generate unique request ID / Benzersiz istek ID'si oluştur
      const requestId = `_${Buffer.from(Math.random().toString()).toString('base64url').substring(0, 20)}`;
      const issueInstant = new Date().toISOString();

      // Get SP entity ID and ACS URL / SP entity ID ve ACS URL'sini al
      const spEntityId = ssoConfig.issuer || ssoConfig.audience || '';
      const acsUrl = ssoConfig.acsUrl || '';

      if (!spEntityId || !acsUrl) {
        throw new BadRequestException('SP entity ID and ACS URL must be configured for SAML');
      }

      // Generate SAML AuthnRequest XML / SAML AuthnRequest XML'i oluştur
      // Note: This is a basic implementation. For production, use saml2-js or similar library
      // Not: Bu temel bir uygulamadır. Üretim için saml2-js veya benzeri bir kütüphane kullanın
      const samlRequest = `<?xml version="1.0" encoding="UTF-8"?>
<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
  xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
  ID="${requestId}"
  Version="2.0"
  IssueInstant="${issueInstant}"
  Destination="${idpSsoUrl}"
  AssertionConsumerServiceURL="${acsUrl}"
  ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
  <saml:Issuer>${spEntityId}</saml:Issuer>
  <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/>
</samlp:AuthnRequest>`;

      // Encode SAML request (base64 and URL encode) / SAML isteğini kodla (base64 ve URL kodlama)
      const encodedRequest = Buffer.from(samlRequest).toString('base64');
      const urlEncodedRequest = encodeURIComponent(encodedRequest);

      // Build redirect URL with SAMLRequest parameter / SAMLRequest parametresi ile yönlendirme URL'si oluştur
      const redirectUrl = `${idpSsoUrl}${idpSsoUrl.includes('?') ? '&' : '?'}SAMLRequest=${urlEncodedRequest}`;

      return {
        url: redirectUrl,
        type: 'SAML',
      };
    } else if (ssoConfig.protocol === 'OIDC') {
      if (!ssoConfig.authorizationEndpoint || !ssoConfig.clientId || !ssoConfig.acsUrl) {
        throw new BadRequestException('OIDC endpoints not fully configured');
      }

      // Generate OAuth2 authorization URL
      const state = Buffer.from(JSON.stringify({ orgSlug, returnUrl })).toString('base64url');
      const nonce = Buffer.from(Math.random().toString()).toString('base64url');

      const params = new URLSearchParams({
        client_id: ssoConfig.clientId,
        redirect_uri: ssoConfig.acsUrl,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce,
      });

      return {
        url: `${ssoConfig.authorizationEndpoint}?${params.toString()}`,
        type: 'OIDC',
      };
    }

    throw new BadRequestException('Invalid SSO protocol');
  }
}
