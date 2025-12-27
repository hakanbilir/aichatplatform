// apps/api-gateway/src/routes/sso.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { prisma } from '@ai-chat/db';
import { z } from 'zod';
import { findOrProvisionUserFromSso } from '../sso/ssoService';
import { handleSamlCallback } from '../sso/samlHandler';
import { handleOidcCallback } from '../sso/oidcHandler';
import { JwtPayload } from '../auth/types';

const ssoStartParamsSchema = z.object({
  orgSlug: z.string().min(1),
  connectionId: z.string().min(1),
});

const samlCallbackQuerySchema = z.object({
  connectionId: z.string().min(1),
  orgId: z.string().min(1),
});

const samlCallbackBodySchema = z.object({
  SAMLResponse: z.string().optional(),
  RelayState: z.string().optional(),
}).passthrough(); // Allow other fields if necessary

const oidcCallbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  connectionId: z.string().min(1),
  orgId: z.string().min(1),
});

export default async function ssoRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Initiate SSO (redirect to IdP)
  app.get('/auth/sso/:orgSlug/:connectionId/start', async (req, reply) => {
    const parseResult = ssoStartParamsSchema.safeParse(req.params);
    if (!parseResult.success) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', details: parseResult.error.format() });
    }

    const { orgSlug, connectionId } = parseResult.data;

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
    const queryParseResult = samlCallbackQuerySchema.safeParse(req.query);
    if (!queryParseResult.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY', details: queryParseResult.error.format() });
    }
    const { connectionId, orgId } = queryParseResult.data;

    const bodyParseResult = samlCallbackBodySchema.safeParse(req.body);
    if (!bodyParseResult.success) {
      return reply.code(400).send({ error: 'INVALID_BODY', details: bodyParseResult.error.format() });
    }
    const body = bodyParseResult.data as any; // Cast to any to access potentially missing props if we used strict schema, but here we used passthrough

    const connection = await prisma.ssoConnection.findFirst({
      where: { id: connectionId, orgId, isEnabled: true }
    });

    if (!connection) {
      return reply.code(404).send({ error: 'SSO_CONNECTION_NOT_FOUND' });
    }

    const userInfo = await handleSamlCallback(body.SAMLResponse || '', body.RelayState || '', connection.config as Record<string, any>);

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
    const queryParseResult = oidcCallbackQuerySchema.safeParse(req.query);
    if (!queryParseResult.success) {
      return reply.code(400).send({ error: 'INVALID_QUERY', details: queryParseResult.error.format() });
    }
    const { code, state, connectionId, orgId } = queryParseResult.data;

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
