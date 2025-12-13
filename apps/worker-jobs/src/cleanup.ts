// apps/worker-jobs/src/cleanup.ts

import { prisma } from '@ai-chat/db';

/**
 * Cleanup worker for data retention (50.md)
 * Veri saklama için temizleme işçisi (50.md)
 */
export async function runDataRetentionCleanup() {
  const orgs = await prisma.orgDataRetentionConfig.findMany({
    where: {
      autoDeleteEnabled: true
    }
  });

  const now = new Date();

  for (const cfg of orgs) {
    // Soft delete conversations based on conversationRetentionDays
    // conversationRetentionDays'e göre konuşmaları yumuşak sil
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

    // Delete messages based on messageRetentionDays
    // messageRetentionDays'e göre mesajları sil
    if (cfg.messageRetentionDays) {
      const messageCutoff = new Date(
        now.getTime() - cfg.messageRetentionDays * 24 * 60 * 60 * 1000
      );

      await prisma.message.deleteMany({
        where: {
          orgId: cfg.orgId,
          createdAt: { lt: messageCutoff }
        }
      });
    }

    // Delete files based on fileRetentionDays
    // fileRetentionDays'e göre dosyaları sil
    if (cfg.fileRetentionDays) {
      const fileCutoff = new Date(
        now.getTime() - cfg.fileRetentionDays * 24 * 60 * 60 * 1000
      );

      await prisma.file.deleteMany({
        where: {
          orgId: cfg.orgId,
          createdAt: { lt: fileCutoff }
        }
      });
    }

    // Update last cleanup timestamp
    // Son temizleme zaman damgasını güncelle
    await prisma.orgDataRetentionConfig.update({
      where: { id: cfg.id },
      data: { lastCleanupAt: now }
    });
  }
}

/**
 * Clean up expired audit logs (50.md)
 * Süresi dolmuş audit log'ları temizle (50.md)
 */
export async function cleanupExpiredAuditLogs() {
  // Get orgs with audit retention config
  // Audit saklama yapılandırması olan org'ları al
  const orgs = await prisma.orgDataRetentionConfig.findMany({
    where: {
      autoDeleteEnabled: true
    }
  });

  const now = new Date();

  for (const cfg of orgs) {
    // Default audit retention: 90 days if not specified
    // Varsayılan audit saklama: belirtilmezse 90 gün
    const auditRetentionDays = (cfg as any).auditRetentionDays ?? 90;
    const cutoff = new Date(
      now.getTime() - auditRetentionDays * 24 * 60 * 60 * 1000
    );

    await prisma.event.deleteMany({
      where: {
        orgId: cfg.orgId,
        createdAt: { lt: cutoff }
      }
    });
  }
}
