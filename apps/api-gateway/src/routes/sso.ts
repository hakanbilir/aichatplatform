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

    // In production, generate SAML AuthnRequest or OIDC authorization URL
    // For now, redirect to a mock callback
    const callbackUrl = `${req.protocol}://${req.hostname}/auth/sso/${connection.type}/callback?connectionId=${connectionId}&orgId=${org.id}`;
    return reply.redirect(callbackUrl);
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
