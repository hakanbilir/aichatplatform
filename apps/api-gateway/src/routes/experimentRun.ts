// apps/api-gateway/src/routes/experimentRun.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { completeWithRouting } from '../llm/router';
import { resolveModelForOrg } from '../llm/modelRegistryService';
import { recordUsage } from '../usage/usageTracker';

const runExperimentSchema = z.object({
  inputIds: z.array(z.string()).optional(),
  variantIds: z.array(z.string()).optional()
});

export default async function experimentRunRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.post(
    '/orgs/:orgId/experiments/:experimentId/run',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const { orgId, experimentId } = req.params as any;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:experiments:write'
      );

      const parsed = runExperimentSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const experiment = await prisma.experiment.findFirst({
        where: { id: experimentId, orgId },
        include: { variants: true, inputs: true }
      });

      if (!experiment) {
        return reply.code(404).send({ error: 'EXPERIMENT_NOT_FOUND' });
      }

      const variants = experiment.variants.filter((v) =>
        parsed.data.variantIds ? parsed.data.variantIds.includes(v.id) : true
      );
      const inputs = experiment.inputs.filter((i) =>
        parsed.data.inputIds ? parsed.data.inputIds.includes(i.id) : true
      );

      const results: any[] = [];

      for (const variant of variants) {
        // Derive model + config
        let modelProvider = 'ollama';
        let modelName = 'llama3';
        let temperature = 0.7;
        let topP = 1.0;
        let maxTokens: number | null = null;

        if (variant.chatProfileId) {
          const profile = await prisma.chatProfile.findFirst({ where: { id: variant.chatProfileId } });
          if (profile) {
            modelProvider = profile.modelProvider;
            modelName = profile.modelName;
            temperature = profile.temperature;
            topP = profile.topP;
            maxTokens = profile.maxTokens ?? null;
          }
        }

        await resolveModelForOrg(orgId, modelProvider, modelName);

        for (const input of inputs) {
          const startedAt = Date.now();

          const messages = [] as { role: 'system' | 'user'; content: string }[];
          if (variant.systemPrompt) {
            messages.push({ role: 'system', content: variant.systemPrompt });
          }
          messages.push({ role: 'user', content: input.content });

          const completion = await completeWithRouting({
            orgId,
            modelProvider,
            modelName,
            messages,
            temperature,
            topP,
            maxTokens
          });

          const latency = Date.now() - startedAt;

          const run = await prisma.experimentRun.create({
            data: {
              experimentId: experiment.id,
              variantId: variant.id,
              inputId: input.id,
              modelProvider,
              modelName,
              temperature,
              topP,
              maxTokens,
              output: completion.content,
              latencyMs: latency,
              inputTokens: completion.usage?.promptTokens ?? null,
              outputTokens: completion.usage?.completionTokens ?? null
            }
          });

          // Record usage for analytics (45.md)
          // Analitik için kullanımı kaydet (45.md)
          await recordUsage({
            orgId,
            userId: payload.userId,
            provider: modelProvider,
            modelName,
            feature: 'experiment',
            inputTokens: completion.usage?.promptTokens ?? 0,
            outputTokens: completion.usage?.completionTokens ?? 0
          }).catch((err) => {
            console.error('Failed to record experiment usage:', err);
          });

          results.push({ runId: run.id, variantId: variant.id, inputId: input.id });

          // Optional: emitEvent('experiment.run.completed', { orgId, experimentId, runId: run.id })
        }
      }

      return reply.send({ ok: true, runs: results });
    }
  );
}
