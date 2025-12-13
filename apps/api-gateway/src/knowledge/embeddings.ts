// apps/api-gateway/src/knowledge/embeddings.ts

export interface EmbeddingProviderConfig {
  model: string;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * Get the default embedding provider (OpenAI).
 * Varsayılan embedding sağlayıcısını al (OpenAI).
 */
export function getDefaultEmbeddingProvider(): {
  provider: EmbeddingProvider;
  config: EmbeddingProviderConfig;
} {
  const apiKey = process.env.EMBEDDING_API_KEY;
  const model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

  const config: EmbeddingProviderConfig = {
    model
  };

  const provider: EmbeddingProvider = {
    async embed(texts: string[]): Promise<number[][]> {
      if (!apiKey) {
        throw new Error('EMBEDDING_API_KEY environment variable is not set');
      }

      if (texts.length === 0) {
        return [];
      }

      try {
        const response = await fetch(`${baseUrl}/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            input: texts
          })
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`OpenAI embeddings API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as {
          data: Array<{ embedding: number[] }>;
          model: string;
          usage?: { prompt_tokens: number; total_tokens: number };
        };

        // OpenAI returns embeddings in the same order as input texts
        // OpenAI, giriş metinleriyle aynı sırada embedding'leri döndürür
        return data.data.map(item => item.embedding);
      } catch (err) {
        if (err instanceof Error) {
          throw err;
        }
        throw new Error(`Failed to generate embeddings: ${String(err)}`);
      }
    }
  };

  return { provider, config };
}

