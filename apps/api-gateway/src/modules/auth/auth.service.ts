import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@mergenhan/db';
import * as argon2 from 'argon2';
import { createLogger } from '@mergenhan/observability';
import Redis from 'ioredis';
import { LoginDto } from './dto/auth.dto';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  isSuperAdmin?: boolean;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = createLogger({ service: 'auth' });
  private redis: Redis | null = null;
  private readonly lockoutMaxAttempts = parseInt(process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS || '5', 10);
  private readonly lockoutDuration = parseInt(process.env.ACCOUNT_LOCKOUT_DURATION || '15', 10) * 60; // Convert minutes to seconds

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Initialize Redis connection for account lockout tracking
    // Hesap kilitleme takibi için Redis bağlantısını başlat
    this.initRedis();
  }

  /**
   * Initialize Redis connection for account lockout
   * Hesap kilitleme için Redis bağlantısını başlat
   */
  private async initRedis() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        connectTimeout: 10000,
        lazyConnect: true,
        enableOfflineQueue: false,
      });
      await this.redis.connect().catch(() => {
        // Redis connection failure is not critical - lockout will be disabled
        // Redis bağlantı hatası kritik değil - kilitleme devre dışı kalacak
        this.logger.warn('Redis connection failed - account lockout disabled');
        this.redis = null;
      });
    } catch (error) {
      this.logger.warn({ error }, 'Failed to initialize Redis - account lockout disabled');
      this.redis = null;
    }
  }

  /**
   * Validate user credentials with production-ready security features
   * Üretim hazır güvenlik özellikleri ile kullanıcı kimlik bilgilerini doğrula
   */
  async validateUser(email: string, password: string, ipAddress?: string, correlationId?: string): Promise<any> {
    const startTime = Date.now();
    const maskedEmail = this.maskEmail(email);

    try {
      // Check account lockout status / Hesap kilitleme durumunu kontrol et
      const isLocked = await this.checkAccountLockout(email);
      if (isLocked) {
        this.logSecurityEvent('login_failed', {
          email: maskedEmail,
          reason: 'account_locked',
          ipAddress,
          correlationId,
        });
        throw new UnauthorizedException('Account temporarily locked due to too many failed login attempts. Please try again later.');
      }

      // Look up user (always perform lookup to prevent user enumeration)
      // Kullanıcıyı ara (kullanıcı numaralandırmasını önlemek için her zaman arama yap)
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      // Auto-create user in demo mode if user doesn't exist / Demo modunda kullanıcı yoksa otomatik oluştur
      if (!user) {
        const isProduction = process.env.NODE_ENV === 'production';
        const demoModeEnabled = process.env.DEMO_MODE === 'true';
        
        // Only enable in non-production or when explicitly enabled in production
        // Sadece üretim dışında veya üretimde açıkça etkinleştirildiğinde etkinleştir
        const isDemoMode = demoModeEnabled && (!isProduction || demoModeEnabled);
        
        if (isDemoMode) {
          // Validate password strength for auto-created accounts / Otomatik oluşturulan hesaplar için şifre gücünü doğrula
          this.validatePasswordStrength(password);
          
          // Create user with provided password / Sağlanan şifre ile kullanıcı oluştur
          const passwordHash = await argon2.hash(password);
          const name = email.split('@')[0];
          
          user = await this.prisma.user.create({
            data: {
              email,
              name,
              passwordHash,
              isSystemAdmin: false,
            },
          });

          this.logSecurityEvent('user_created', {
            email: maskedEmail,
            ipAddress,
            correlationId,
            reason: 'demo_mode_auto_create',
          });
        } else {
          // Perform dummy password verification to prevent user enumeration (timing attack prevention)
          // Kullanıcı numaralandırmasını önlemek için sahte şifre doğrulaması yap (zamanlama saldırısı önleme)
          await this.performDummyPasswordVerification();
          throw new UnauthorizedException('Invalid email or password');
        }
      }

      // If user exists but has no password hash, create one / Kullanıcı varsa ancak şifre hash'i yoksa, bir tane oluştur
      if (user && !user.passwordHash) {
        const passwordHash = await argon2.hash(password);
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { passwordHash },
        });
      }

      // Verify password with constant-time comparison / Sabit zamanlı karşılaştırma ile şifreyi doğrula
      let isValid = false;
      if (user && user.passwordHash) {
        try {
          isValid = await argon2.verify(user.passwordHash, password);
        } catch (error) {
          // Argon2 verification error - treat as invalid
          // Argon2 doğrulama hatası - geçersiz olarak değerlendir
          isValid = false;
        }
      }

      if (!isValid) {
        // Record failed attempt / Başarısız denemeyi kaydet
        await this.recordFailedAttempt(email);
        
        this.logSecurityEvent('login_failed', {
          email: maskedEmail,
          reason: 'invalid_credentials',
          ipAddress,
          correlationId,
          duration: Date.now() - startTime,
        });
        
        throw new UnauthorizedException('Invalid email or password');
      }

      // Successful login - reset failed attempts / Başarılı giriş - başarısız denemeleri sıfırla
      await this.resetFailedAttempts(email);

      this.logSecurityEvent('login_success', {
        email: maskedEmail,
        userId: user.id,
        ipAddress,
        correlationId,
        duration: Date.now() - startTime,
      });

      const { passwordHash, ...result } = user;
      return result;
    } catch (error) {
      // Re-throw UnauthorizedException as-is / UnauthorizedException'ı olduğu gibi yeniden fırlat
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log unexpected errors / Beklenmeyen hataları günlükle
      this.logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          email: maskedEmail,
          ipAddress,
          correlationId,
        },
        'Unexpected error during user validation',
      );
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  /**
   * Check if account is locked due to too many failed attempts
   * Çok fazla başarısız deneme nedeniyle hesabın kilitli olup olmadığını kontrol et
   */
  private async checkAccountLockout(email: string): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const lockKey = `account_lockout:${email}`;
      const locked = await this.redis.get(lockKey);
      return locked === '1';
    } catch (error) {
      this.logger.warn({ error, email: this.maskEmail(email) }, 'Failed to check account lockout');
      return false; // Fail open - don't block if Redis is unavailable
    }
  }

  /**
   * Record a failed login attempt
   * Başarısız giriş denemesini kaydet
   */
  private async recordFailedAttempt(email: string): Promise<void> {
    if (!this.redis) return;

    try {
      const attemptsKey = `login_attempts:${email}`;
      const lockKey = `account_lockout:${email}`;

      // Increment attempt counter / Deneme sayacını artır
      const attempts = await this.redis.incr(attemptsKey);
      
      // Set expiration on first attempt / İlk denemede sona erme süresini ayarla
      if (attempts === 1) {
        await this.redis.expire(attemptsKey, this.lockoutDuration);
      }

      // Lock account if max attempts reached / Maksimum deneme sayısına ulaşılırsa hesabı kilitle
      if (attempts >= this.lockoutMaxAttempts) {
        await this.redis.setex(lockKey, this.lockoutDuration, '1');
        this.logger.warn(
          {
            email: this.maskEmail(email),
            attempts,
            lockoutDuration: this.lockoutDuration,
          },
          'Account locked due to too many failed login attempts',
        );
      }
    } catch (error) {
      this.logger.warn({ error, email: this.maskEmail(email) }, 'Failed to record failed attempt');
    }
  }

  /**
   * Reset failed login attempts on successful login
   * Başarılı girişte başarısız giriş denemelerini sıfırla
   */
  private async resetFailedAttempts(email: string): Promise<void> {
    if (!this.redis) return;

    try {
      const attemptsKey = `login_attempts:${email}`;
      const lockKey = `account_lockout:${email}`;
      await this.redis.del(attemptsKey, lockKey);
    } catch (error) {
      this.logger.warn({ error, email: this.maskEmail(email) }, 'Failed to reset failed attempts');
    }
  }

  /**
   * Perform dummy password verification to prevent timing attacks
   * Zamanlama saldırılarını önlemek için sahte şifre doğrulaması yap
   */
  private async performDummyPasswordVerification(): Promise<void> {
    // Use a dummy hash to ensure constant-time operation
    // Sabit zamanlı işlem sağlamak için sahte hash kullan
    const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummy';
    try {
      await argon2.verify(dummyHash, 'dummy_password');
    } catch {
      // Ignore error - this is intentional
    }
  }

  /**
   * Validate password strength for auto-created accounts
   * Otomatik oluşturulan hesaplar için şifre gücünü doğrula
   */
  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
    }
  }

  /**
   * Mask email for logging (privacy protection)
   * Günlükleme için e-postayı maskele (gizlilik koruması)
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return '***@***';
    
    const maskedLocal = localPart.length > 2 
      ? `${localPart.substring(0, 2)}***` 
      : '***';
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Log security events for monitoring and audit
   * İzleme ve denetim için güvenlik olaylarını günlükle
   */
  private logSecurityEvent(
    event: 'login_success' | 'login_failed' | 'user_created' | 'account_locked',
    metadata: {
      email: string;
      userId?: string;
      reason?: string;
      ipAddress?: string;
      correlationId?: string;
      duration?: number;
    },
  ): void {
    const logData = {
      event,
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    if (event === 'login_success') {
      this.logger.info(logData, 'Login successful');
    } else if (event === 'login_failed') {
      this.logger.warn(logData, 'Login failed');
    } else if (event === 'user_created') {
      this.logger.info(logData, 'User auto-created in demo mode');
    } else if (event === 'account_locked') {
      this.logger.warn(logData, 'Account locked');
    }
  }

  async login(user: any) {
    // Check if user is superadmin
    let isSuperAdmin = user.isSystemAdmin || false;

    // Also check if user has superadmin role in any org
    if (!isSuperAdmin) {
      const membership = await this.prisma.orgMembership.findFirst({
        where: {
          userId: user.id,
          roles: {
            has: 'superadmin',
          },
          isDisabled: false,
        },
      });
      if (membership) {
        isSuperAdmin = true;
      }
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isSuperAdmin,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin,
      },
    };
  }

  async refresh(user: any) {
    // Check if user is superadmin
    let isSuperAdmin = user.isSystemAdmin || false;

    if (!isSuperAdmin) {
      const membership = await this.prisma.orgMembership.findFirst({
        where: {
          userId: user.sub || user.id,
          roles: {
            has: 'superadmin',
          },
          isDisabled: false,
        },
      });
      if (membership) {
        isSuperAdmin = true;
      }
    }

    const payload: JwtPayload = {
      sub: user.sub || user.id,
      email: user.email,
      isSuperAdmin,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateApiKey(hashedKey: string): Promise<any> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { hashedKey },
      include: {
        org: true,
        project: true,
      },
    });

    if (!apiKey || apiKey.revokedAt) {
      throw new UnauthorizedException('Invalid API key');
    }

    return {
      apiKeyId: apiKey.id,
      orgId: apiKey.orgId,
      projectId: apiKey.projectId,
      scopes: apiKey.scopes,
    };
  }

  /**
   * Initiate SSO login flow
   * Redirects to IdP based on org SSO config
   */
  async initiateSso(orgSlug: string) {
    const org = await this.prisma.organization.findUnique({
      where: { slug: orgSlug },
      include: { ssoConfig: true },
    });

    if (!org || !org.ssoConfig || org.ssoConfig.status !== 'ACTIVE') {
      throw new UnauthorizedException('SSO not configured for this organization');
    }

    const ssoConfig = org.ssoConfig;

    if (ssoConfig.protocol === 'SAML') {
      // SAML SP-initiated SSO
      // In a real implementation, this would generate a SAML AuthnRequest
      // and redirect to the IdP SSO URL
      const config = ssoConfig.config as Record<string, any> | null;
      return {
        redirectUrl: config?.['idpSsoUrl'] || config?.['ssoUrl'],
        samlRequest: 'BASE64_ENCODED_SAML_REQUEST', // Would be generated
        relayState: orgSlug,
      };
    } else if (ssoConfig.protocol === 'OIDC') {
      // OIDC authorization code flow
      const state = Buffer.from(JSON.stringify({ orgId: org.id, orgSlug })).toString('base64');
      const params = new URLSearchParams({
        client_id: ssoConfig.clientId || '',
        redirect_uri: ssoConfig.acsUrl || '',
        response_type: 'code',
        scope: 'openid email profile',
        state,
        nonce: Math.random().toString(36).substring(7),
      });

      return {
        redirectUrl: `${ssoConfig.authorizationEndpoint}?${params.toString()}`,
      };
    }

    throw new UnauthorizedException('Unsupported SSO protocol');
  }

  /**
   * Handle SAML Assertion Consumer Service callback
   * SAML Assertion Consumer Service callback'ini işle
   */
  async handleSamlAcs(body: any, req: any) {
    try {
      // Extract SAMLResponse from POST body / POST body'den SAMLResponse'u çıkar
      const samlResponse = body.SAMLResponse || body.samlResponse;
      if (!samlResponse) {
        throw new UnauthorizedException('SAMLResponse not found in request body');
      }

      // Decode base64 SAML response / Base64 SAML yanıtını çöz
      let samlXml: string;
      try {
        samlXml = Buffer.from(samlResponse, 'base64').toString('utf-8');
      } catch (error: any) {
        throw new UnauthorizedException('Invalid SAMLResponse encoding');
      }

      // Extract orgId from RelayState or request / RelayState veya istekten orgId'yi çıkar
      const relayState = body.RelayState || body.relayState || req.query?.org;
      let orgId: string | null = null;

      if (relayState) {
        // Try to parse orgId from relayState / relayState'ten orgId'yi ayrıştırmayı dene
        try {
          const stateData = JSON.parse(Buffer.from(relayState, 'base64url').toString());
          orgId = stateData.orgId || null;
        } catch {
          // If not JSON, assume relayState is orgSlug / JSON değilse, relayState'in orgSlug olduğunu varsay
          const org = await this.prisma.organization.findUnique({
            where: { slug: relayState },
          });
          orgId = org?.id || null;
        }
      }

      if (!orgId) {
        throw new UnauthorizedException('Organization identifier not found in SAML request');
      }

      // Get SSO config for org / Org için SSO yapılandırmasını al
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        include: { ssoConfig: true },
      });

      if (
        !org ||
        !org.ssoConfig ||
        org.ssoConfig.status !== 'ACTIVE' ||
        org.ssoConfig.protocol !== 'SAML'
      ) {
        throw new UnauthorizedException(
          'SAML SSO not configured or inactive for this organization',
        );
      }

      // Parse SAML XML to extract attributes / Öznitelikleri çıkarmak için SAML XML'ini ayrıştır
      // Note: In production, use a proper SAML library like saml2-js or passport-saml
      // Not: Üretimde saml2-js veya passport-saml gibi uygun bir SAML kütüphanesi kullanın
      const attributes = this.parseSamlAttributes(samlXml, org.ssoConfig);

      if (!attributes.email) {
        throw new UnauthorizedException('Email attribute not found in SAML assertion');
      }

      // Use SsoService to handle the callback (reuse existing logic) / Callback'i işlemek için SsoService'i kullan (mevcut mantığı yeniden kullan)
      // Import SsoService dynamically to avoid circular dependency / Döngüsel bağımlılığı önlemek için SsoService'i dinamik olarak içe aktar
      // @ts-expect-error - Dynamic import to avoid circular dependency
      const ssoModule = await import('../sso/sso.service');
      // @ts-expect-error - Dynamic import to avoid circular dependency
      const enterpriseModule = await import('../../enterprise/enterprise.service');
      const EnterpriseService = enterpriseModule.EnterpriseService;
      const SsoService = ssoModule.SsoService;
      const enterpriseService = new EnterpriseService(this.prisma);
      const ssoService = new SsoService(this.prisma, this.jwtService, enterpriseService, this);

      const result = await ssoService.handleSsoCallback(orgId, attributes);

      return {
        access_token: result.access_token,
        user: result.user,
        orgId: result.orgId,
        redirectUrl: req.query?.returnUrl || '/',
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(`SAML authentication failed: ${error.message}`);
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
   * Handle OIDC callback
   * OIDC callback'ini işle
   */
  async handleOidcCallback(query: any, req: any) {
    try {
      const { code, state, error } = query;

      if (error) {
        throw new UnauthorizedException(`OIDC error: ${error}`);
      }

      if (!code) {
        throw new UnauthorizedException('Authorization code not provided');
      }

      // Parse state to get org info / Org bilgisini almak için state'i ayrıştır
      let stateData: any = {};
      let orgId: string | null = null;

      try {
        stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        orgId = stateData.orgId || null;
      } catch {
        // If state parsing fails, try to extract from query / State ayrıştırma başarısız olursa, sorgudan çıkarmayı dene
        const orgSlug = query.org || state;
        if (orgSlug) {
          const org = await this.prisma.organization.findUnique({
            where: { slug: orgSlug },
          });
          orgId = org?.id || null;
        }
      }

      if (!orgId) {
        throw new UnauthorizedException('Organization identifier not found in OIDC callback');
      }

      // Get SSO config for org / Org için SSO yapılandırmasını al
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        include: { ssoConfig: true },
      });

      if (
        !org ||
        !org.ssoConfig ||
        org.ssoConfig.status !== 'ACTIVE' ||
        org.ssoConfig.protocol !== 'OIDC'
      ) {
        throw new UnauthorizedException(
          'OIDC SSO not configured or inactive for this organization',
        );
      }

      const ssoConfig = org.ssoConfig;

      if (!ssoConfig.tokenEndpoint || !ssoConfig.clientId || !ssoConfig.acsUrl) {
        throw new UnauthorizedException('OIDC configuration incomplete');
      }

      // Get client secret from storage / Depolamadan client secret'ı al
      const clientSecret =
        ssoConfig.clientSecretRef || process.env[`OIDC_CLIENT_SECRET_${orgId}`] || '';

      if (!clientSecret) {
        throw new UnauthorizedException('OIDC client secret not configured');
      }

      // Exchange authorization code for tokens / Yetkilendirme kodunu token'lar için değiştir
      const axios = (await import('axios')).default;
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
        throw new UnauthorizedException('ID token not received from IdP');
      }

      // Decode ID token (JWT) / ID token'ı (JWT) çöz
      // Note: In production, verify signature using JWKS / Not: Üretimde JWKS kullanarak imzayı doğrula
      const idTokenParts = id_token.split('.');
      if (idTokenParts.length !== 3) {
        throw new UnauthorizedException('Invalid ID token format');
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
        throw new UnauthorizedException('Email not found in OIDC token');
      }

      // Use SsoService to handle the callback (reuse existing logic) / Callback'i işlemek için SsoService'i kullan (mevcut mantığı yeniden kullan)
      // @ts-expect-error - Dynamic import to avoid circular dependency
      const ssoModule = await import('../sso/sso.service');
      // @ts-expect-error - Dynamic import to avoid circular dependency
      const enterpriseModule = await import('../../enterprise/enterprise.service');
      const EnterpriseService = enterpriseModule.EnterpriseService;
      const SsoService = ssoModule.SsoService;
      const enterpriseService = new EnterpriseService(this.prisma);
      const ssoService = new SsoService(this.prisma, this.jwtService, enterpriseService, this);

      const result = await ssoService.handleSsoCallback(orgId, attributes);

      return {
        access_token: result.access_token,
        user: result.user,
        orgId: result.orgId,
        redirectUrl: stateData.returnUrl || req.query?.returnUrl || '/',
      };
    } catch (error: any) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(`OIDC authentication failed: ${error.message}`);
    }
  }
}
