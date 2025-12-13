// apps/api-gateway/src/services/knowledgeRetrieval.ts

import { prisma } from '@ai-chat/db';
import { getDefaultEmbeddingProvider } from '../knowledge/embeddings';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  text: string;
  score: number;
}

export async function retrieveRelevantChunks(params: {
  orgId: string;
  spaceId?: string | null;
  query: string;
  limit?: number;
}): Promise<RetrievedChunk[]> {
  const { provider } = getDefaultEmbeddingProvider();

  let queryEmbedding: number[];
  try {
    const embeddings = await provider.embed([params.query]);
    queryEmbedding = embeddings[0];
  } catch (err) {
    // If embedding fails, return empty results
    return [];
  }

  const limit = params.limit ?? 8;

  // Convert embedding array to pgvector format
  // pgvector expects a string like '[0.1,0.2,0.3]'
  const embeddingStr = '[' + queryEmbedding.join(',') + ']';

  // Use pgvector similarity search
  // Note: This assumes pgvector extension is installed and embeddings are stored as vector type
  // pgvector benzerlik araması kullan
  // Not: pgvector uzantısının yüklü olduğunu ve embedding'lerin vector tipinde saklandığını varsayar
  let rows: any[];
  if (params.spaceId) {
    rows = await prisma.$queryRawUnsafe<Array<{ id: string; documentId: string; text: string; score: number }>>(
      `
      SELECT id, "documentId", text,
             1 - (embedding <=> $1::vector) AS score
      FROM "KnowledgeDocumentChunk"
      WHERE "orgId" = $2
        AND embedding IS NOT NULL
        AND "documentId" IN (SELECT id FROM "KnowledgeDocument" WHERE "spaceId" = $3)
      ORDER BY embedding <=> $1::vector
      LIMIT $4
      `,
      embeddingStr,
      params.orgId,
      params.spaceId,
      limit
    );
  } else {
    rows = await prisma.$queryRawUnsafe<Array<{ id: string; documentId: string; text: string; score: number }>>(
      `
      SELECT id, "documentId", text,
             1 - (embedding <=> $1::vector) AS score
      FROM "KnowledgeDocumentChunk"
      WHERE "orgId" = $2
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $1::vector
      LIMIT $3
      `,
      embeddingStr,
      params.orgId,
      limit
    );
  }

  return rows.map((row) => ({
    chunkId: row.id,
    documentId: row.documentId,
    text: row.text,
    score: Number(row.score)
  }));
}

