// apps/api-gateway/src/services/knowledgeIngestion.ts

import { prisma } from '@ai-chat/db';
import { chunkText } from '../knowledge/chunkText';
import { getDefaultEmbeddingProvider } from '../knowledge/embeddings';
import { logger } from '../observability/logger';

export async function ingestDocumentFromText(params: {
  orgId: string;
  spaceId: string;
  title: string;
  text: string;
  sourceType?: string;
  sourceUrl?: string | null;
}): Promise<{ documentId: string }> {
  const doc = await prisma.knowledgeDocument.create({
    data: {
      orgId: params.orgId,
      spaceId: params.spaceId,
      title: params.title,
      sourceType: params.sourceType ?? 'api',
      sourceUrl: params.sourceUrl ?? null,
      text: params.text,
      status: 'pending'
    }
  });

  const job = await prisma.embeddingJob.create({
    data: {
      orgId: params.orgId,
      spaceId: params.spaceId,
      documentId: doc.id,
      status: 'pending'
    }
  });

  // Synchronous ingestion (for now). For large docs, move to a background queue.
  try {
    await runEmbeddingJob(job.id);
  } catch (err) {
    logger.error({
      event: 'knowledge.ingest.error',
      orgId: params.orgId,
      documentId: doc.id,
      error: (err as Error).message
    }, 'Knowledge ingestion failed');
  }

  return { documentId: doc.id };
}

export async function runEmbeddingJob(jobId: string): Promise<void> {
  const job = await prisma.embeddingJob.findUnique({ where: { id: jobId } });
  if (!job) {
    throw new Error('Embedding job not found');
  }

  await prisma.embeddingJob.update({
    where: { id: job.id },
    data: { status: 'running', error: null }
  });

  const doc = await prisma.knowledgeDocument.findUnique({
    where: { id: job.documentId }
  });

  if (!doc) {
    throw new Error('Document not found for embedding job');
  }

  const rawText = doc.text ?? '';

  if (!rawText) {
    throw new Error('Document has no text content');
  }

  const chunks = chunkText(rawText, { maxChars: 1500 });

  const { provider } = getDefaultEmbeddingProvider();

  // If provider is not implemented, this will throw; you can skip embeddings initially.
  let embeddings: number[][];
  try {
    embeddings = await provider.embed(chunks);
  } catch (err) {
    // If embedding fails, still create chunks without embeddings
    logger.warn({
      event: 'knowledge.embed.failed',
      jobId: job.id,
      documentId: doc.id,
      error: (err as Error).message
    }, 'Embedding provider failed, creating chunks without embeddings');

    embeddings = chunks.map(() => []); // Empty embeddings
  }

  // Delete existing chunks
  await prisma.knowledgeDocumentChunk.deleteMany({ where: { documentId: doc.id } });

  // Insert chunks with embeddings using raw SQL (for pgvector)
  // Note: Prisma doesn't support vector types directly, so we use raw SQL
  for (let index = 0; index < chunks.length; index++) {
    const chunk = chunks[index];
    const embedding = embeddings[index] && embeddings[index].length > 0
      ? embeddings[index]
      : null;

    if (embedding) {
      // Use raw SQL to insert with vector type
      // pgvector expects array format: '[0.1,0.2,0.3]'
      const embeddingStr = '[' + embedding.join(',') + ']';
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO "KnowledgeDocumentChunk" (id, "createdAt", "updatedAt", "orgId", "documentId", index, text, embedding)
        VALUES (gen_random_uuid()::text, NOW(), NOW(), $1::text, $2::text, $3::integer, $4::text, $5::vector)
        `,
        doc.orgId,
        doc.id,
        index,
        chunk,
        embeddingStr
      );
    } else {
      // Insert without embedding (can use Prisma for this)
      await prisma.knowledgeDocumentChunk.create({
        data: {
          orgId: doc.orgId,
          documentId: doc.id,
          index,
          text: chunk
        }
      });
    }
  }

  await prisma.$transaction([
    prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: 'ingested',
        statusMessage: null
      }
    }),
    prisma.embeddingJob.update({
      where: { id: job.id },
      data: { status: 'completed', error: null }
    })
  ]);
}

