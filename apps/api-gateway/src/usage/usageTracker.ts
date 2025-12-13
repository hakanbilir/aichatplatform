// apps/api-gateway/src/usage/usageTracker.ts

import { prisma } from '@ai-chat/db';
import { UsageEvent } from './types';

export async function recordUsage(event: UsageEvent) {
  // Look up pricing from ModelRegistryEntry
  const modelEntry = await prisma.modelRegistryEntry.findFirst({
    where: {
      OR: [
        { orgId: event.orgId, provider: event.provider, modelName: event.modelName },
        { orgId: null, provider: event.provider, modelName: event.modelName }
      ],
      isEnabled: true
    }
  });

  const inputPriceMicros = modelEntry?.inputPriceMicros ?? 0;
  const outputPriceMicros = modelEntry?.outputPriceMicros ?? 0;

  const estimatedCostMicros =
    Math.floor((event.inputTokens * inputPriceMicros) / 1_000_000) +
    Math.floor((event.outputTokens * outputPriceMicros) / 1_000_000);

  // Upsert daily aggregates (OrgDailyUsage, OrgUserDailyUsage)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await Promise.all([
    // Org-level aggregate
    prisma.orgDailyUsage.upsert({
      where: {
        org_date_provider_model_feature_unique: {
          orgId: event.orgId,
          date: today,
          provider: event.provider,
          modelName: event.modelName,
          feature: event.feature
        }
      },
      update: {
        requestCount: { increment: 1 },
        inputTokens: { increment: event.inputTokens },
        outputTokens: { increment: event.outputTokens },
        estimatedCostMicros: { increment: estimatedCostMicros }
      },
      create: {
        orgId: event.orgId,
        date: today,
        provider: event.provider,
        modelName: event.modelName,
        feature: event.feature,
        requestCount: 1,
        inputTokens: event.inputTokens,
        outputTokens: event.outputTokens,
        estimatedCostMicros
      }
    }),

    // User-level aggregate (if userId provided)
    event.userId
      ? prisma.orgUserDailyUsage.upsert({
          where: {
            org_user_date_provider_model_feature_unique: {
              orgId: event.orgId,
              userId: event.userId,
              date: today,
              provider: event.provider,
              modelName: event.modelName,
              feature: event.feature
            }
          },
          update: {
            requestCount: { increment: 1 },
            inputTokens: { increment: event.inputTokens },
            outputTokens: { increment: event.outputTokens },
            estimatedCostMicros: { increment: estimatedCostMicros }
          },
          create: {
            orgId: event.orgId,
            userId: event.userId,
            date: today,
            provider: event.provider,
            modelName: event.modelName,
            feature: event.feature,
            requestCount: 1,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            estimatedCostMicros
          }
        })
      : Promise.resolve()
  ]);

  // Optional: emitEvent('usage.recorded', { orgId: event.orgId, ... })
}
