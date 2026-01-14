
import { prisma } from '@ai-chat/db';

export async function processDatasetIngestionBatch(limit: number = 10): Promise<number> {
  const datasets = await prisma.datasetVersion.findMany({
    where: { status: 'PROCESSING' },
    take: limit,
    include: {
      files: true,
    },
  });

  let processedCount = 0;

  for (const version of datasets) {
    try {
      // In a real system, we would stream the file from S3 and count tokens/rows.
      // Here we simulate successful processing after a delay.

      const primaryFile = version.files.find(f => f.id === version.primaryFileId) || version.files[0];

      // Update stats based on file size approximation if not real processing
      // Assuming ~4 chars per token and ~100 tokens per row for estimation if not calculated
      const estimatedTokens = primaryFile ? Math.ceil(primaryFile.fileSizeBytes / 4) : 0;
      const estimatedRows = Math.ceil(estimatedTokens / 100);

      await prisma.datasetVersion.update({
        where: { id: version.id },
        data: {
          status: 'READY',
          tokenCount: estimatedTokens,
          rowCount: estimatedRows,
        },
      });

      processedCount++;
    } catch (error) {
      console.error(`Error processing dataset version ${version.id}:`, error);
      await prisma.datasetVersion.update({
        where: { id: version.id },
        data: { status: 'FAILED' },
      });
    }
  }

  return processedCount;
}
