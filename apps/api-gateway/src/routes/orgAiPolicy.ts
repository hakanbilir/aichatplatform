// apps/api-gateway/src/routes/orgAiPolicy.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { getOrgAiPolicy, upsertOrgAiPolicy } from '../services/orgAiPolicy';
import { emitEvent } from '../events/emitter';

const policyBodySchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(1024).optional(),
  systemPrompt: z.string().min(1),
  config: z
    .object({
      tone: z.enum(['formal', 'casual', 'neutral']).optional(),
      disallowTopics: z.array(z.string()).optional(),
      extra: z.record(z.any()).optional()
    })
    .optional()
});

export default async function orgAiPolicyRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  app.get('/orgs/:orgId/ai-policy', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:manage'
    );

    const policy = await getOrgAiPolicy(orgId);
    return reply.send({ policy });
  });

  app.put('/orgs/:orgId/ai-policy', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const orgId = (request.params as any).orgId as string;

    await assertOrgPermission(
      { id: payload.userId, isSuperadmin: payload.isSuperadmin },
      orgId,
      'org:settings:manage'
    );

    const parsed = policyBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: request.i18n.t('errors.invalidBody'), details: parsed.error.format() });
    }

    const policy = await upsertOrgAiPolicy({
      orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      systemPrompt: parsed.data.systemPrompt,
      config: parsed.data.config
    });

    // Emit event
    await emitEvent({
      type: 'org.ai_policy_updated',
      context: {
        orgId,
        userId: payload.userId
      },
      metadata: {
        name: policy.name
      }
    }).catch((err) => {
      // Log but don't fail
      console.error('Failed to emit org.ai_policy_updated event:', err);
    });

    return reply.send({ policy });
  });
}

