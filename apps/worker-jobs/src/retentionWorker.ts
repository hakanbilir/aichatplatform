// apps/worker-jobs/src/retentionWorker.ts

import { prisma } from '@ai-chat/db';

export async function enforceRetentionPolicies() {
  const orgs = await prisma.orgDataRetentionConfig.findMany({
    where: {
      autoDeleteEnabled: true
    }
  });

  const now = new Date();

  for (const cfg of orgs) {
    // Soft delete based on conversationRetentionDays
    // conversationRetentionDays'e göre yumuşak silme
    if (cfg.conversationRetentionDays) {
      const cutoff = new Date(
        now.getTime() - cfg.conversationRetentionDays * 24 * 60 * 60 * 1000
      );

      await prisma.conversation.updateMany({
        where: {
          orgId: cfg.orgId,
          deletedAt: null,
          createdAt: { lt: cutoff }
        },
        data: {
          deletedAt: now
        }
      });
    }

    // Hard delete conversations that have been soft-deleted for more than retention period
    // Saklama süresinden daha uzun süre yumuşak silinmiş konuşmaları kalıcı olarak sil
    if (cfg.conversationRetentionDays) {
      const hardDeleteCutoff = new Date(
        now.getTime() - cfg.conversationRetentionDays * 24 * 60 * 60 * 1000
      );

      await prisma.conversation.deleteMany({
        where: {
          orgId: cfg.orgId,
          deletedAt: { not: null, lt: hardDeleteCutoff }
        }
      });
    }
  }
}

