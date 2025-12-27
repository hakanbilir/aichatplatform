import { Controller, Get, Post, Body, Query, Param, Res, Req, UseGuards } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import axios from 'axios';
import { SsoService } from './sso.service';
import { EnterpriseService } from '../../enterprise/enterprise.service';
import { InitiateSsoLoginDto } from '../../enterprise/dto/enterprise.dto';

/**
 * SSO Authentication Controller
 * Handles SP-initiated and IdP-initiated SSO flows
 */
@ApiTags('SSO Authentication')
@Controller('auth/sso')
export class SsoController {
  constructor(
    private ssoService: SsoService,
    private enterpriseService: EnterpriseService,
  ) {}

  /**
   * SP-initiated SSO login
   * User enters org slug, gets redirected to IdP
   */
  @Get('login')
  @ApiOperation({ summary: 'Initiate SSO login flow' })
  @ApiResponse({ status: 302, description: 'Redirect to IdP for authentication' })
  async initiateLogin(
    @Query('org') orgSlug: string,
    @Query('returnUrl') returnUrl: string,
    @Res() res: FastifyReply,
  ) {
    if (!orgSlug) {
      return res.code(400).send({ error: 'Organization slug is required' });
    }

    try {
      const { url } = await this.ssoService.getSsoLoginUrl(orgSlug, returnUrl);
      return res.redirect(url);
    } catch (error: any) {
      return res.code(error.status || 500).send({
        error: error.message || 'Failed to initiate SSO login',
      });
    }
  }

  /**
   * SAML callback endpoint
   * Receives SAML assertion after IdP authentication
   */
  @Post(':orgId/callback')
  @ApiOperation({ summary: 'SAML SSO callback endpoint' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async samlCallback(
    @Param('orgId') orgId: string,
    @Body() body: any,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    try {
      // Extract SAMLResponse from POST body / POST body'den SAMLResponse'u çıkar
      const samlResponse = body.SAMLResponse || body.samlResponse;
      if (!samlResponse) {
        return res.code(400).send({ error: 'SAMLResponse not found in request body' });
      }

      // Get SSO config for org / Org için SSO yapılandırmasını al
      const ssoConfig = await this.enterpriseService.getSsoConfig(orgId);

      if (!ssoConfig || ssoConfig.protocol !== 'SAML' || ssoConfig.status !== 'ACTIVE') {
        return res
          .code(400)
          .send({ error: 'SAML not configured or inactive for this organization' });
      }

      // Decode base64 SAML response / Base64 SAML yanıtını çöz
      let samlXml: string;
      try {
        samlXml = Buffer.from(samlResponse, 'base64').toString('utf-8');
      } catch (error: any) {
        return res.code(400).send({ error: 'Invalid SAMLResponse encoding' });
      }

      // Parse SAML XML to extract attributes / Öznitelikleri çıkarmak için SAML XML'ini ayrıştır
      // Note: In production, use a proper SAML library and validate signature / Üretimde uygun bir SAML kütüphanesi kullan ve imzayı doğrula
      const attributes = this.parseSamlAttributes(samlXml, ssoConfig);

      if (!attributes.email) {
        return res.code(400).send({ error: 'Email attribute not found in SAML assertion' });
      }

      const result = await this.ssoService.handleSsoCallback(orgId, attributes);

      // Redirect to frontend with token or set cookie / Token ile frontend'e yönlendir veya cookie ayarla
      const returnUrl = (req.query as { returnUrl?: string }).returnUrl || '/';
      return res.redirect(`${returnUrl}?token=${result.access_token}`);
    } catch (error: any) {
      return res.code(error.status || 500).send({
        error: error.message || 'SSO authentication failed',
      });
    }
  }

  /**
   * Parse SAML attributes from XML
   * XML'den SAML özniteliklerini ayrıştır
   */
  private parseSamlAttributes(
    samlXml: string,
    ssoConfig: any,
  ): {
    subject: string;
    email: string;
    name?: string;
    groups?: string[];
  } {
    // Basic XML parsing for SAML attributes / SAML öznitelikleri için temel XML ayrıştırma
    // In production, use a proper XML parser and validate signature / Üretimde uygun bir XML ayrıştırıcı kullan ve imzayı doğrula

    const emailAttribute = ssoConfig.emailAttribute || 'email';
    const nameAttribute = ssoConfig.nameAttribute || 'name';
    const groupsAttribute = ssoConfig.groupsAttribute || 'groups';

    // Extract subject from NameID or Subject / NameID veya Subject'ten subject'i çıkar
    const subjectMatch =
      samlXml.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i) ||
      samlXml.match(/<saml:Subject[^>]*>[\s\S]*?<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : '';

    // Extract email attribute / Email özniteliğini çıkar
    let email = '';
    const emailPatterns = [
      new RegExp(
        `<saml:Attribute[^>]*Name="${emailAttribute}"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
      new RegExp(
        `<saml:Attribute[^>]*Name="Email"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
      new RegExp(
        `<saml:Attribute[^>]*Name="mail"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
      new RegExp(
        `<saml:Attribute[^>]*Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
    ];

    for (const pattern of emailPatterns) {
      const match = samlXml.match(pattern);
      if (match && match[1]) {
        email = match[1].trim();
        break;
      }
    }

    // If no email found in attributes, try using subject if it looks like an email / Özniteliklerde email bulunamazsa, subject email gibi görünüyorsa onu kullan
    if (!email && subject.includes('@')) {
      email = subject;
    }

    // Extract name attribute / İsim özniteliğini çıkar
    let name: string | undefined;
    const namePatterns = [
      new RegExp(
        `<saml:Attribute[^>]*Name="${nameAttribute}"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
      new RegExp(
        `<saml:Attribute[^>]*Name="Name"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
      new RegExp(
        `<saml:Attribute[^>]*Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>`,
        'i',
      ),
    ];

    for (const pattern of namePatterns) {
      const match = samlXml.match(pattern);
      if (match && match[1]) {
        name = match[1].trim();
        break;
      }
    }

    // Extract groups attribute / Gruplar özniteliğini çıkar
    const groups: string[] = [];
    const groupsPattern = new RegExp(
      `<saml:Attribute[^>]*Name="${groupsAttribute}"[^>]*>([\\s\\S]*?)<\\/saml:Attribute>`,
      'i',
    );
    const groupsMatch = samlXml.match(groupsPattern);
    if (groupsMatch && groupsMatch[1]) {
      const attributeValues = groupsMatch[1].matchAll(
        /<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      );
      for (const match of attributeValues) {
        if (match[1]) {
          groups.push(match[1].trim());
        }
      }
    }

    return {
      subject: subject || email,
      email,
      name,
      groups: groups.length > 0 ? groups : undefined,
    };
  }

  /**
   * OIDC callback endpoint
   * Receives authorization code after IdP authentication
   */
  @Get(':orgId/callback')
  @ApiOperation({ summary: 'OIDC SSO callback endpoint' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async oidcCallback(
    @Param('orgId') orgId: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ) {
    if (error) {
      return res.code(401).send({ error: `OIDC error: ${error}` });
    }

    if (!code) {
      return res.code(400).send({ error: 'Authorization code not provided' });
    }

    try {
      // Parse state to get org info / Org bilgisini almak için state'i ayrıştır
      let stateData: any = {};
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
      } catch {
        // Ignore state parsing errors / State ayrıştırma hatalarını yoksay
      }

      // Get SSO config for token exchange / Token değişimi için SSO yapılandırmasını al
      const ssoConfig = await this.enterpriseService.getSsoConfig(orgId);

      if (!ssoConfig || ssoConfig.protocol !== 'OIDC') {
        return res.code(400).send({ error: 'OIDC not configured for this organization' });
      }

      if (!ssoConfig.tokenEndpoint || !ssoConfig.clientId || !ssoConfig.acsUrl) {
        return res.code(400).send({ error: 'OIDC configuration incomplete' });
      }

      // Get client secret from storage / Depolamadan client secret'ı al
      // Note: In production, retrieve from secure storage / Not: Üretimde güvenli depolamadan al
      const clientSecret =
        ssoConfig.clientSecretRef || process.env[`OIDC_CLIENT_SECRET_${orgId}`] || '';

      if (!clientSecret) {
        return res.code(500).send({ error: 'OIDC client secret not configured' });
      }

      // Exchange authorization code for tokens / Yetkilendirme kodunu token'lar için değiştir
      const tokenResponse = await axios.post(
        ssoConfig.tokenEndpoint,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: ssoConfig.acsUrl,
          client_id: ssoConfig.clientId,
          client_secret: clientSecret,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, id_token } = tokenResponse.data;

      if (!id_token) {
        return res.code(400).send({ error: 'ID token not received from IdP' });
      }

      // Decode ID token (JWT) / ID token'ı (JWT) çöz
      // Note: In production, verify signature using JWKS / Not: Üretimde JWKS kullanarak imzayı doğrula
      const idTokenParts = id_token.split('.');
      if (idTokenParts.length !== 3) {
        return res.code(400).send({ error: 'Invalid ID token format' });
      }

      // Decode payload (base64url) / Payload'ı çöz (base64url)
      const payload = JSON.parse(Buffer.from(idTokenParts[1], 'base64url').toString('utf-8'));

      // Extract user attributes from ID token / ID token'dan kullanıcı özniteliklerini çıkar
      const emailAttribute = ssoConfig.emailAttribute || 'email';
      const nameAttribute = ssoConfig.nameAttribute || 'name';
      const groupsAttribute = ssoConfig.groupsAttribute || 'groups';

      const attributes = {
        subject: payload.sub || payload.email || '',
        email: payload[emailAttribute] || payload.email || '',
        name: payload[nameAttribute] || payload.name || payload.given_name || '',
        groups: payload[groupsAttribute] || payload.groups || [],
      };

      // If groups not in ID token, try userinfo endpoint / Gruplar ID token'da yoksa userinfo endpoint'ini dene
      if ((!attributes.groups || attributes.groups.length === 0) && ssoConfig.jwksUri) {
        try {
          const userinfoUrl = ssoConfig.jwksUri.replace('/.well-known/jwks.json', '/userinfo');
          const userinfoResponse = await axios.get(userinfoUrl, {
            headers: {
              Authorization: `Bearer ${access_token}`,
            },
          });

          if (userinfoResponse.data[groupsAttribute]) {
            attributes.groups = userinfoResponse.data[groupsAttribute];
          }
        } catch {
          // Ignore userinfo errors / Userinfo hatalarını yoksay
        }
      }

      if (!attributes.email) {
        return res.code(400).send({ error: 'Email not found in OIDC token' });
      }

      // Handle SSO callback with extracted attributes / Çıkarılan özniteliklerle SSO callback'ini işle
      const result = await this.ssoService.handleSsoCallback(orgId, attributes);

      const returnUrl = stateData.returnUrl || '/';
      return res.redirect(`${returnUrl}?token=${result.access_token}`);
    } catch (error: any) {
      return res.code(error.status || 500).send({
        error: error.message || 'OIDC authentication failed',
      });
    }
  }

  /**
   * SAML SP metadata endpoint
   * Returns XML metadata for IdP configuration
   */
  @Get(':orgId/metadata')
  @ApiOperation({ summary: 'Get SAML SP metadata' })
  @ApiResponse({ status: 200, description: 'SAML SP metadata XML', type: String })
  async getMetadata(@Param('orgId') orgId: string, @Res() res: FastifyReply) {
    try {
      // This would typically be handled by the enterprise service
      // but we can redirect or proxy it
      return res.redirect(`/enterprise/sso/metadata?orgId=${orgId}`);
    } catch (error: any) {
      return res.code(error.status || 500).send({
        error: error.message || 'Failed to retrieve metadata',
      });
    }
  }
}
