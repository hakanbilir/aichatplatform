import { prisma } from '@ai-chat/db';

export async function processDatasetIngestionBatch(batchSize = 10): Promise<number> {
  // Find datasets in PROCESSING state (which we interpret as queued for ingestion simulation)
  const processingVersions = await prisma.datasetVersion.findMany({
    where: {
      status: 'PROCESSING',
    },
    take: batchSize,
    include: {
        files: true
    }
  });

  let processedCount = 0;

  for (const version of processingVersions) {
    // Simulate processing time/logic
    // For now, we just mark it as READY and calculate token count from file size (approx 1 token ~ 4 bytes)

    // Check if we already did simulation (maybe update stats field?)
    // But for this simulation, we assume PROCESSING means it's ready to be processed.

    // We cannot easily update tokenCount as it is on KnowledgeChunk usually, but here schema says nothing about tokenCount on DatasetVersion.
    // Wait, checking schema:
    // model DatasetVersion { ... rowCount Int @default(0) ... }

    let totalBytes = 0;
    for (const file of version.files) {
        totalBytes += file.fileSizeBytes;
    }

    // Simulate row count (e.g. 1000 bytes per row?)
    const rowCount = Math.max(1, Math.floor(totalBytes / 1000));

    await prisma.datasetVersion.update({
        where: { id: version.id },
        data: {
            status: 'READY',
            rowCount: rowCount,
            stats: {
                processedAt: new Date().toISOString(),
                fileSize: totalBytes
            }
        }
    });

    processedCount++;
  }

  return processedCount;
}
