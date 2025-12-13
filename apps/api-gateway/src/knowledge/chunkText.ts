// apps/api-gateway/src/knowledge/chunkText.ts

export interface ChunkOptions {
  maxChars?: number; // rough heuristic; refine later by tokens if needed
}

export function chunkText(text: string, options: ChunkOptions = {}): string[] {
  const maxChars = options.maxChars ?? 1500;

  const chunks: string[] = [];
  let current = '';

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > maxChars) {
      if (current.trim().length > 0) {
        chunks.push(current.trim());
      }
      current = sentence;
    } else {
      current = current ? current + ' ' + sentence : sentence;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}

