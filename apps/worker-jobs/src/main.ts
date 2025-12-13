/* eslint-disable no-console */

import { getConfig } from '@ai-chat/config';

const config = getConfig();

console.log('Worker jobs process started.', {
  env: config.NODE_ENV,
  concurrency: config.WORKER_CONCURRENCY,
});

// Process webhook deliveries every 5 seconds
setInterval(async () => {
  try {
    const { processWebhooksBatch } = await import('./webhookDispatcher');
    const processed = await processWebhooksBatch(50);
    if (processed > 0) {
      console.log(`Processed ${processed} webhook deliveries`);
    }
  } catch (err) {
    console.error('Error processing webhooks:', err);
  }
}, 5000);

// Process export jobs every 10 seconds
setInterval(async () => {
  try {
    const { processConversationExportBatch } = await import('./conversationExportWorker');
    const processed = await processConversationExportBatch(10);
    if (processed > 0) {
      console.log(`Processed ${processed} export jobs`);
    }
  } catch (err) {
    console.error('Error processing exports:', err);
  }
}, 10000);

// Enforce retention policies daily (every 24 hours)
setInterval(async () => {
  try {
    const { enforceRetentionPolicies } = await import('./retentionWorker');
    await enforceRetentionPolicies();
    console.log('Retention policies enforced');
  } catch (err) {
    console.error('Error enforcing retention policies:', err);
  }
}, 24 * 60 * 60 * 1000);

// Clean up expired refresh tokens daily
// Süresi dolmuş refresh token'ları günlük olarak temizle
setInterval(async () => {
  try {
    const { cleanupExpiredTokens } = await import('@ai-chat/db');
    const count = await cleanupExpiredTokens();
    if (count > 0) {
      console.log(`Cleaned up ${count} expired refresh tokens`);
    }
  } catch (err) {
    console.error('Error cleaning up expired tokens:', err);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

// Data retention cleanup (50.md)
// Veri saklama temizleme (50.md)
setInterval(async () => {
  try {
    const { runDataRetentionCleanup, cleanupExpiredAuditLogs } = await import('./cleanup');
    await runDataRetentionCleanup();
    await cleanupExpiredAuditLogs();
    console.log('Data retention cleanup completed');
  } catch (err) {
    console.error('Error running data retention cleanup:', err);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours

// In later docs, this file will be expanded with additional queue consumers and scheduled jobs.
// Gelecek dokümanlarda bu dosya ek kuyruk tüketicileri ve zamanlanmış işlerle genişletilecek.

