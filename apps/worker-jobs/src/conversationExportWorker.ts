// apps/worker-jobs/src/conversationExportWorker.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import { prisma } from '@ai-chat/db';
import { ConversationExportFormat } from '@ai-chat/core-types';

// This is a simple implementation writing to local disk; in real deployments, use S3/minio.
const EXPORT_DIR = process.env.EXPORT_DIR ?? path.join(process.cwd(), 'exports');

async function ensureExportDir() {
  await fs.mkdir(EXPORT_DIR, { recursive: true });
}

async function buildExportContent(
  format: ConversationExportFormat,
  conversation: any,
  messages: any[]
): Promise<string> {
  if (format === 'jsonl') {
    const lines = messages.map((m) =>
      JSON.stringify({
        id: m.id,
        createdAt: m.createdAt,
        role: m.role,
        content: m.content
      })
    );
    return lines.join('\n');
  }

  if (format === 'markdown') {
    const header = `# ${conversation.title}\n\n`; // basic markdown escape can be added
    const body = messages
      .map((m) => `**${m.role.toUpperCase()}** (${m.createdAt.toISOString()}):\n\n${m.content}\n`)
      .join('\n');
    return header + body;
  }

  if (format === 'html') {
    const items = messages
      .map(
        (m) =>
          `<div class="message"><div class="meta">${m.role.toUpperCase()} · ${m.createdAt.toISOString()}</div><pre>${
            // basic escaping
            String(m.content)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
          }</pre></div>`
      )
      .join('\n');

    return `<!doctype html><html><head><meta charset="utf-8" /><title>${conversation.title}</title></head><body>${items}</body></html>`;
  }

  throw new Error(`Unsupported export format: ${format}`);
}

export async function processConversationExportBatch(limit = 10) {
  await ensureExportDir();

  const jobs = await prisma.conversationExport.findMany({
    where: { status: 'pending' },
    take: limit
  });

  for (const job of jobs) {
    try {
      await prisma.conversationExport.update({
        where: { id: job.id },
        data: { status: 'processing' }
      });

      if (!job.conversationId) {
        throw new Error('conversationId is required for this export worker');
      }

      const conversation = await prisma.conversation.findUnique({
        where: { id: job.conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } }
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      const content = await buildExportContent(
        job.format as ConversationExportFormat,
        conversation,
        conversation.messages
      );

      const filename = `${job.id}.${job.format}`;
      const fullPath = path.join(EXPORT_DIR, filename);

      await fs.writeFile(fullPath, content, 'utf8');

      await prisma.conversationExport.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          storageKey: fullPath
        }
      });
    } catch (err) {
      await prisma.conversationExport.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: (err as Error).message
        }
      });
    }
  }

  return jobs.length;
}

