// apps/api-gateway/src/sso/samlHandler.ts

/**
 * Handle SAML callback by parsing SAML response and extracting user profile.
 * SAML callback'ini işle: SAML yanıtını parse et ve kullanıcı profilini çıkar.
 */
export async function handleSamlCallback(
  samlResponse: string,
  _relayState: string | null, // Reserved for SAML relay state handling
  _config?: Record<string, any> // Reserved for future SAML config usage
): Promise<{ email: string; name: string | null; groups: string[] }> {
  if (!samlResponse) {
    throw new Error('SAML response is required');
  }

  try {
    // Decode base64 SAML response
    // Base64 SAML yanıtını decode et
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Basic XML parsing to extract attributes
    // Attribute'leri çıkarmak için temel XML parsing
    // In production, use a proper SAML library (e.g., saml2-js, passport-saml) for signature validation
    // Production'da imza doğrulaması için uygun bir SAML kütüphanesi kullan (örn. saml2-js, passport-saml)

    // Extract email from common SAML attribute names
    // Yaygın SAML attribute isimlerinden email'i çıkar
    const emailPatterns = [
      /<saml:Attribute[^>]*Name="([^"]*email[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<Attribute[^>]*Name="([^"]*email[^"]*)"[^>]*>[\s\S]*?<AttributeValue[^>]*>([^<]+)<\/AttributeValue>/gi,
      /<saml2:Attribute[^>]*Name="([^"]*email[^"]*)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/gi,
      /NameID[^>]*>([^<@]+@[^<]+)<\/NameID/gi,
      /<Email[^>]*>([^<]+)<\/Email>/gi
    ];

    let email: string | null = null;
    for (const pattern of emailPatterns) {
      const matches = Array.from(decoded.matchAll(pattern));
      if (matches.length > 0) {
        email = matches[0][matches[0].length - 1]?.trim() || null;
        if (email && email.includes('@')) {
          break;
        }
      }
    }

    if (!email) {
      throw new Error('Email not found in SAML response');
    }

    // Extract name from common SAML attribute names
    // Yaygın SAML attribute isimlerinden ismi çıkar
    const namePatterns = [
      /<saml:Attribute[^>]*Name="([^"]*name[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<Attribute[^>]*Name="([^"]*name[^"]*)"[^>]*>[\s\S]*?<AttributeValue[^>]*>([^<]+)<\/AttributeValue>/gi,
      /<saml2:Attribute[^>]*Name="([^"]*name[^"]*)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/gi,
      /<saml:Attribute[^>]*Name="([^"]*displayname[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<saml:Attribute[^>]*Name="([^"]*cn[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<GivenName[^>]*>([^<]+)<\/GivenName>/gi,
      /<Surname[^>]*>([^<]+)<\/Surname>/gi
    ];

    let name: string | null = null;
    let givenName: string | null = null;
    let surname: string | null = null;

    for (const pattern of namePatterns) {
      const matches = Array.from(decoded.matchAll(pattern));
      for (const match of matches) {
        const attrName = (match[1] || '').toLowerCase();
        const attrValue = match[match.length - 1]?.trim();
        
        if (attrValue) {
          if (attrName.includes('given') || attrName.includes('first')) {
            givenName = attrValue;
          } else if (attrName.includes('surname') || attrName.includes('last') || attrName.includes('family')) {
            surname = attrValue;
          } else if (attrName.includes('name') || attrName.includes('display') || attrName.includes('cn')) {
            name = attrValue;
          }
        }
      }
    }

    // Combine given name and surname if available
    // Varsa ad ve soyadı birleştir
    if (!name && (givenName || surname)) {
      name = [givenName, surname].filter(Boolean).join(' ') || null;
    }

    // Extract groups from common SAML attribute names
    // Yaygın SAML attribute isimlerinden grupları çıkar
    const groupPatterns = [
      /<saml:Attribute[^>]*Name="([^"]*group[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<Attribute[^>]*Name="([^"]*group[^"]*)"[^>]*>[\s\S]*?<AttributeValue[^>]*>([^<]+)<\/AttributeValue>/gi,
      /<saml2:Attribute[^>]*Name="([^"]*group[^"]*)"[^>]*>[\s\S]*?<saml2:AttributeValue[^>]*>([^<]+)<\/saml2:AttributeValue>/gi,
      /<saml:Attribute[^>]*Name="([^"]*memberof[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi,
      /<saml:Attribute[^>]*Name="([^"]*role[^"]*)"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/gi
    ];

    const groups: string[] = [];
    for (const pattern of groupPatterns) {
      const matches = Array.from(decoded.matchAll(pattern));
      for (const match of matches) {
        const groupValue = match[match.length - 1]?.trim();
        if (groupValue && !groups.includes(groupValue)) {
          groups.push(groupValue);
        }
      }
    }

    return {
      email,
      name,
      groups
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(`SAML callback processing failed: ${String(err)}`);
  }
}
