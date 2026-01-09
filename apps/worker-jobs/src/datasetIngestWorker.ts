
import { prisma } from '@ai-chat/db';
import { StorageService } from '@ai-chat/config';

// Helper to parse storage URI
function parseStorageUri(uri: string): { bucket: string; key: string } | null {
  if (!uri.startsWith('s3://')) return null;
  const parts = uri.slice(5).split('/');
  const bucket = parts[0];
  const key = parts.slice(1).join('/');
  return { bucket, key };
}

export async function processDatasetIngestBatch(limit = 10) {
  // Find versions that are PROCESSING.
  // Note: We rely on rowCount being 0 (default) or stats being null to identify unprocessed items
  // if we want to be extra safe, but status 'PROCESSING' is the main signal.
  // We assume that once 'READY', it won't be 'PROCESSING' again.
  // If a worker crashes, the job remains 'PROCESSING' and is picked up again.

  const jobs = await prisma.datasetVersion.findMany({
    where: {
      status: 'PROCESSING',
    },
    take: limit,
    include: {
      primaryFile: true
    }
  });

  const storageService = new StorageService();
  let processedCount = 0;

  for (const version of jobs) {
    // If stats is not null, it might mean it was already processed but status update failed?
    // Or if rowCount > 0.
    // But let's assume if it is PROCESSING, we process it.

    try {
      if (!version.primaryFile) {
        throw new Error('No primary file associated with version');
      }

      const { storageUri } = version.primaryFile;
      const parsed = parseStorageUri(storageUri);
      if (!parsed) {
        throw new Error(`Invalid storage URI: ${storageUri}`);
      }

      // Get signed URL
      const signedUrl = await storageService.getSignedUrl(parsed.key, 300); // 5 mins

      // Fetch file
      const response = await fetch(signedUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      let rowCount = 0;
      let firstLine = '';

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
             if (buffer.trim()) rowCount++; // Count last line if not empty
             break;
          }

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');

          // Capture first line for validation check
          if (rowCount === 0 && parts.length > 1) {
             firstLine = parts[0];
          }

          // All parts except last are complete lines
          // Filter empty lines if needed, but for row count usually newlines matter.
          // JSONL shouldn't have empty lines ideally, but let's count all non-empty lines.

          for (let i = 0; i < parts.length - 1; i++) {
             if (parts[i].trim()) rowCount++;
          }

          buffer = parts[parts.length - 1];
        }
      } else {
         // Fallback for non-stream response (shouldn't happen with fetch usually)
         const text = await response.text();
         const lines = text.split('\n').filter(l => l.trim());
         rowCount = lines.length;
         if (lines.length > 0) firstLine = lines[0];
      }

      // Basic validation: check if first line is valid JSON (if JSONL)
      if (rowCount > 0 && firstLine) {
        try {
            JSON.parse(firstLine);
        } catch (e) {
             // Just log, don't fail the job for now unless strict validation is required.
             // The task is "Enqueue dataset ingest job", not "Validate".
             // But let's verify if we can mark it as invalid?
             // There is no INVALID status. FAILED is appropriate.
             console.warn(`Dataset ${version.id} file does not appear to be valid JSONL`);
             // We could throw here if we want to enforce JSONL.
        }
      }

      // Update version
      await prisma.datasetVersion.update({
        where: { id: version.id },
        data: {
          status: 'READY',
          rowCount,
          stats: {
             processedAt: new Date().toISOString(),
             fileSize: version.primaryFile.fileSizeBytes,
             mimeType: version.primaryFile.mimeType
          }
        }
      });

      processedCount++;

    } catch (err) {
      console.error(`Error processing dataset version ${version.id}:`, err);

      await prisma.datasetVersion.update({
        where: { id: version.id },
        data: {
          status: 'FAILED',
          metadata: {
             ...(version.metadata as object || {}),
             error: (err as Error).message
          }
        }
      });
    }
  }

  return processedCount;
}
