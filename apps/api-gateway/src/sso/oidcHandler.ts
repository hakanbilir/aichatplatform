// apps/api-gateway/src/sso/oidcHandler.ts

/**
 * Handle OIDC callback by exchanging authorization code for tokens and extracting user profile.
 * OIDC callback'ini işle: authorization code'u token'larla değiştir ve kullanıcı profilini çıkar.
 */
export async function handleOidcCallback(
  code: string,
  _state: string, // Reserved for CSRF protection validation
  config: Record<string, any>
): Promise<{ email: string; name: string | null; groups: string[] }> {
  const clientId = config.clientId as string;
  const clientSecret = config.clientSecret as string;
  const tokenEndpoint = config.tokenEndpoint as string;
  const redirectUri = config.redirectUri as string;
  // @ts-ignore - intentionally unused, reserved for future use
  const _issuer = config.issuer as string; // Reserved for future issuer validation
  void _issuer; // Suppress unused variable warning

  if (!clientId || !clientSecret || !tokenEndpoint || !redirectUri) {
    throw new Error('OIDC configuration is incomplete. Missing required fields: clientId, clientSecret, tokenEndpoint, redirectUri');
  }

  try {
    // Exchange authorization code for tokens
    // Authorization code'u token'larla değiştir
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text().catch(() => 'Unknown error');
      throw new Error(`OIDC token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText} - ${errorText}`);
    }

    const tokens = await tokenResponse.json() as {
      id_token: string;
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    };

    // Decode and verify ID token (basic JWT parsing)
    // ID token'ı decode et ve doğrula (temel JWT parsing)
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new Error('ID token not found in token response');
    }

    // Parse JWT (basic implementation - in production, use a JWT library with signature verification)
    // JWT'yi parse et (temel implementasyon - production'da imza doğrulaması ile bir JWT kütüphanesi kullan)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid ID token format');
    }

    // Decode payload (base64url)
    // Payload'ı decode et (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
    ) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      given_name?: string;
      family_name?: string;
      preferred_username?: string;
      groups?: string[];
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'?: string[];
      [key: string]: any;
    };

    // Extract user information from claims
    // Claim'lerden kullanıcı bilgilerini çıkar
    const email = payload.email || payload.preferred_username;
    if (!email) {
      throw new Error('Email not found in ID token claims');
    }

    const name = payload.name || 
                 (payload.given_name && payload.family_name 
                   ? `${payload.given_name} ${payload.family_name}` 
                   : null) ||
                 payload.preferred_username ||
                 null;

    // Extract groups from various possible claim names
    // Çeşitli olası claim isimlerinden grupları çıkar
    const groups = payload.groups || 
                  payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups'] || 
                  [];

    return {
      email,
      name,
      groups: Array.isArray(groups) ? groups : []
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`OIDC callback processing failed: ${String(err)}`);
  }
}
