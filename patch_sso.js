const fs = require('fs');

const ssoPath = 'apps/api-gateway/src/routes/sso.ts';
let code = fs.readFileSync(ssoPath, 'utf8');

code = code.replace(
  "    // In production, generate SAML AuthnRequest or OIDC authorization URL\n    // For now, redirect to a mock callback\n    const callbackUrl = `${req.protocol}://${req.hostname}/auth/sso/${connection.type}/callback?connectionId=${connectionId}&orgId=${org.id}`;\n    return reply.redirect(callbackUrl);",
  `    if (connection.type === 'SAML') {
      const callbackUrl = \`\${req.protocol}://\${req.hostname}/auth/sso/saml/callback?connectionId=\${connectionId}&orgId=\${org.id}\`;
      return reply.redirect(callbackUrl);
    } else {
      const callbackUrl = \`\${req.protocol}://\${req.hostname}/auth/sso/oidc/callback?connectionId=\${connectionId}&orgId=\${org.id}\`;
      return reply.redirect(callbackUrl);
    }`
);

fs.writeFileSync(ssoPath, code);
