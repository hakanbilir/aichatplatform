// apps/api-gateway/src/routes/playground.ts

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';
import { prisma } from '@ai-chat/db';
import { JwtPayload } from '../auth/types';
import { assertOrgPermission } from '../rbac/guards';
import { completeWithRouting } from '../llm/router';
import { resolveModelForOrg } from '../llm/modelRegistryService';
import { recordUsage } from '../usage/usageTracker';

const playgroundSchema = z.object({
  chatProfileId: z.string().optional(),
  modelProvider: z.string().optional(),
  modelName: z.string().optional(),
  prompt: z.string().min(1),
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(32768).nullable().optional()
});

export default async function playgroundRoutes(
  app: FastifyInstance,
  _opts: FastifyPluginOptions
) {
  app.post(
    '/orgs/:orgId/playground/complete',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const payload = req.user as JwtPayload;
      const orgId = (req.params as any).orgId as string;

      await assertOrgPermission(
        { id: payload.userId, isSuperadmin: payload.isSuperadmin },
        orgId,
        'org:chat:write'
      );

      const parsed = playgroundSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'INVALID_BODY', details: parsed.error.format() });
      }

      const d = parsed.data;

      // Resolve profile/model
      let modelProvider: string;
      let modelName: string;
      let temperature = d.temperature ?? 0.7;
      let topP = d.topP ?? 1.0;
      let maxTokens = d.maxTokens ?? null;

      if (d.chatProfileId) {
        const profile = await prisma.chatProfile.findFirst({
          where: { id: d.chatProfileId, orgId }
        });
        if (!profile) {
          return reply.code(404).send({ error: 'CHAT_PROFILE_NOT_FOUND' });
        }
        modelProvider = profile.modelProvider;
        modelName = profile.modelName;
        temperature = profile.temperature;
        topP = profile.topP;
        maxTokens = profile.maxTokens ?? maxTokens;
      } else {
        modelProvider = d.modelProvider || 'ollama';
        modelName = d.modelName || 'llama3';
      }

      // Validate against Model Registry
      await resolveModelForOrg(orgId, modelProvider, modelName);

      // Create PlaygroundSession
      const session = await prisma.playgroundSession.create({
        data: {
          orgId,
          userId: payload.userId,
          chatProfileId: d.chatProfileId ?? null,
          modelProvider,
          modelName,
          temperature,
          topP,
          maxTokens
        }
      });

      const userMessage = await prisma.playgroundMessage.create({
        data: {
          sessionId: session.id,
          role: 'user',
          content: d.prompt
        }
      });

      // Construct messages
      const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
      if (d.systemPrompt) {
        messages.push({ role: 'system', content: d.systemPrompt });
      }
      messages.push({ role: 'user', content: d.prompt });

      const startedAt = Date.now();

      const completion = await completeWithRouting({
        orgId,
        modelProvider,
        modelName,
        messages,
        temperature,
        topP,
        maxTokens,
        metadata: {
          orgId,
          chatProfileId: d.chatProfileId ?? undefined,
          conversationId: undefined,
          messageId: userMessage.id
        }
      });

      const latency = Date.now() - startedAt;

      await prisma.playgroundMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: completion.content
        }
      });

      // Record usage for analytics (45.md)
      // Analitik için kullanımı kaydet (45.md)
      await recordUsage({
        orgId,
        userId: payload.userId,
        provider: modelProvider,
        modelName,
        feature: 'playground',
        inputTokens: completion.usage?.promptTokens ?? 0,
        outputTokens: completion.usage?.completionTokens ?? 0
      }).catch((err) => {
        console.error('Failed to record playground usage:', err);
      });

      // Optional: emitEvent('playground.completion', { orgId, userId: payload.userId, ... })

      return reply.send({
        sessionId: session.id,
        output: completion.content,
        latencyMs: latency
      });
    }
  );
}
