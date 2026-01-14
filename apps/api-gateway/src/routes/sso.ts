// apps/api-gateway/src/routes/sso.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { findOrProvisionUserFromSso } from '../sso/ssoService';
import { handleSamlCallback } from '../sso/samlHandler';
import { handleOidcCallback } from '../sso/oidcHandler';
import { JwtPayload } from '../auth/types';

export default async function ssoRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Initiate SSO (redirect to IdP)
  app.get('/auth/sso/:orgSlug/:connectionId/start', async (req, reply) => {
    const { orgSlug, connectionId } = req.params as any;

    const org = await prisma.organization.findUnique({ where: { slug: orgSlug } });
    if (!org) {
      return reply.code(404).send({ error: 'ORG_NOT_FOUND' });
    }

    const connection = await prisma.ssoConnection.findFirst({
      where: { id: connectionId, orgId: org.id, isEnabled: true }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'SSO_CONNECTION_NOT_FOUND' });
    }

    // Determine the target URL based on connection configuration
    // Bağlantı yapılandırmasına göre hedef URL'yi belirle
    const config = connection.config as Record<string, any>;

    // For local development or mock connections, bypass IdP
    if (connection.type === 'DEV_MOCK' || config.mock === true) {
      const callbackUrl = `${req.protocol}://${req.hostname}/auth/sso/saml/callback?connectionId=${connectionId}&orgId=${org.id}`;
      return reply.redirect(callbackUrl);
    }

    // For OIDC, we construct the authorization URL
    if (connection.type === 'OIDC') {
      const { issuer, clientId, authorizationEndpoint } = config;
      if (!authorizationEndpoint && !issuer) {
         return reply.code(400).send({ error: 'SSO_CONFIG_INVALID', message: 'Missing issuer or authorizationEndpoint' });
      }

      const authUrl = new URL(authorizationEndpoint || `${issuer}/authorize`);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('redirect_uri', `${process.env.API_BASE_URL || 'http://localhost:3000'}/auth/sso/oidc/callback`);
      authUrl.searchParams.set('state', JSON.stringify({ connectionId, orgId }));
      authUrl.searchParams.set('scope', 'openid profile email');

      return reply.redirect(authUrl.toString());
    }

    // For SAML, in a real implementation we would generate an AuthnRequest.
    // Since we don't have a SAML library installed in this snippet, we return 501 unless it's mocked.
    if (connection.type === 'SAML') {
      const { entryPoint } = config;
      if (!entryPoint) {
         return reply.code(400).send({ error: 'SSO_CONFIG_INVALID', message: 'Missing entryPoint for SAML' });
      }
      // Note: Real SAML AuthnRequest generation requires a library like 'samlify' or 'passport-saml'.
      // For this environment, we assume the user has configured a valid entryPoint that accepts our redirects,
      // or we fallback to error if not fully implemented.
      return reply.code(501).send({ error: 'NOT_IMPLEMENTED', message: 'SAML AuthnRequest generation not available without external library.' });
    }

    return reply.code(400).send({ error: 'UNSUPPORTED_CONNECTION_TYPE' });
  });

  // SAML callback
  app.post('/auth/sso/saml/callback', async (req, reply) => {
    const body = req.body as any;
    const { connectionId, orgId } = req.query as any;

    const connection = await prisma.ssoConnection.findFirst({
      where: { id: connectionId, orgId, isEnabled: true }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'SSO_CONNECTION_NOT_FOUND' });
    }

    const userInfo = await handleSamlCallback(body.SAMLResponse, body.RelayState, connection.config as Record<string, any>);

    const user = await findOrProvisionUserFromSso(
      orgId,
      userInfo.email,
      userInfo.name,
      userInfo.groups,
      connectionId
    );

    const payload: JwtPayload = {
      userId: user.id,
      orgId,
      isSuperadmin: user.isSuperadmin
    };

    const token = app.jwt.sign(payload);

    return reply.redirect(`${process.env.WEB_BASE_URL || 'http://localhost:5173'}?token=${token}`);
  });

  // OIDC callback
  app.get('/auth/sso/oidc/callback', async (req, reply) => {
    const { code, state, connectionId, orgId } = req.query as any;

    const connection = await prisma.ssoConnection.findFirst({
      where: { id: connectionId, orgId, isEnabled: true }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'SSO_CONNECTION_NOT_FOUND' });
    }

    const userInfo = await handleOidcCallback(code, state, connection.config as Record<string, any>);

    const user = await findOrProvisionUserFromSso(
      orgId,
      userInfo.email,
      userInfo.name,
      userInfo.groups,
      connectionId
    );

    const payload: JwtPayload = {
      userId: user.id,
      orgId,
      isSuperadmin: user.isSuperadmin
    };

    const token = app.jwt.sign(payload);

    return reply.redirect(`${process.env.WEB_BASE_URL || 'http://localhost:5173'}?token=${token}`);
  });
}
