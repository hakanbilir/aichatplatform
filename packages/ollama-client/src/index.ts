import { getConfig } from '@ai-chat/config';
import {
  ChatCompletionParams,
  ChatCompletionResponse,
  ChatMessage,
  ChatStreamEvent,
  LlmModel,
  TokenUsage,
} from '@ai-chat/core-types';

const config = getConfig();

const OLLAMA_BASE_URL = config.OLLAMA_BASE_URL;

// =========================
// Internal types matching Ollama HTTP API
// Ollama HTTP API'sine uyan dahili tipler
// =========================

interface OllamaChatRequestBody {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
  };
}

interface OllamaChatStreamChunk {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  // Usage fields may be present on final chunk
  // Kullanım alanları son chunk'ta mevcut olabilir
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaTagsResponse {
  models: Array<{
    name: string;
    modified_at?: string;
    size?: number;
    digest?: string;
    details?: {
      family?: string;
      parameter_size?: string;
      quantization_level?: string;
    };
  }>;
}

// =========================
// Utility mappers
// Yardımcı mapper'lar
// =========================

function mapMessagesToOllama(messages: ChatMessage[]): { role: string; content: string }[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}

function buildUsageFromChunk(chunk: OllamaChatResponse | OllamaChatStreamChunk): TokenUsage | undefined {
  if (chunk.eval_count == null || chunk.prompt_eval_count == null) {
    return undefined;
  }

  const completionTokens = chunk.eval_count;
  const promptTokens = chunk.prompt_eval_count;

  return {
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
  };
}

// =========================
// Public API
// =========================

/**
 * Simple health check against Ollama.
 * Returns true if the /api/tags endpoint responds successfully.
 * Ollama'ya karşı basit sağlık kontrolü.
 * /api/tags endpoint'i başarıyla yanıt verirse true döner.
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * List available Ollama models and map them to LlmModel objects.
 * Mevcut Ollama modellerini listeler ve LlmModel nesnelerine eşler.
 */
export async function listOllamaModels(): Promise<LlmModel[]> {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);

  if (!res.ok) {
    throw new Error(`Failed to fetch Ollama models: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as OllamaTagsResponse;

  return data.models.map(
    (m): LlmModel => ({
      id: m.name,
      displayName: m.name,
      family: m.details?.family,
      // contextWindowTokens is unknown from tags API; can be enriched later
      // contextWindowTokens tags API'sinden bilinmiyor; daha sonra zenginleştirilebilir
      contextWindowTokens: undefined,
      isDefault: m.name === config.DEFAULT_MODEL,
    }),
  );
}

/**
 * Perform a non-streaming chat completion via Ollama.
 *
 * NOTE: For most UI flows, streaming is preferred. This is a convenience wrapper.
 * Ollama üzerinden streaming olmayan chat completion gerçekleştirir.
 * NOT: Çoğu UI akışı için streaming tercih edilir. Bu bir kolaylık wrapper'ıdır.
 */
export async function createChatCompletion(
  params: ChatCompletionParams,
): Promise<ChatCompletionResponse> {
  const body: OllamaChatRequestBody = {
    model: params.model,
    messages: mapMessagesToOllama(params.messages),
    stream: false,
    options: {
      temperature: params.temperature,
      num_predict: params.maxTokens,
      top_p: params.topP,
    },
  };

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama chat error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as OllamaChatResponse;

  const message: ChatMessage = {
    role: json.message.role as ChatMessage['role'],
    content: json.message.content,
  };

  const usage = buildUsageFromChunk(json);

  return {
    model: json.model,
    message,
    usage,
    providerMeta: json as unknown as Record<string, unknown>,
  };
}

/**
 * Streaming chat completion via Ollama.
 *
 * Yields ChatStreamEvent objects:
 * - type: 'start' (once at beginning)
 * - type: 'token' for each incremental content chunk
 * - type: 'end' with finalMessage + usage (if available)
 * - type: 'error' if anything goes wrong
 * Ollama üzerinden streaming chat completion.
 * ChatStreamEvent nesneleri üretir:
 * - type: 'start' (başlangıçta bir kez)
 * - type: 'token' her artımlı içerik chunk'ı için
 * - type: 'end' finalMessage + usage ile (varsa)
 * - type: 'error' bir şeyler ters giderse
 */
export async function* streamChatCompletion(
  params: ChatCompletionParams & { signal?: AbortSignal },
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const body: OllamaChatRequestBody = {
    model: params.model,
    messages: mapMessagesToOllama(params.messages),
    stream: true,
    options: {
      temperature: params.temperature,
      num_predict: params.maxTokens,
      top_p: params.topP,
    },
  };

  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: params.signal,
  });

  if (!res.ok || !res.body) {
    yield {
      type: 'error',
      error: `Ollama chat error: ${res.status} ${res.statusText}`,
    };
    return;
  }

  // Emit a start event so callers know the stream has begun.
  // Çağıranların stream'in başladığını bilmesi için bir start event'i yayınla.
  yield { type: 'start' };

  const reader = (res.body as any).getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finalContent = '';
  let lastChunk: OllamaChatStreamChunk | null = null;

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let chunk: OllamaChatStreamChunk;
        try {
          chunk = JSON.parse(trimmed) as OllamaChatStreamChunk;
        } catch (err) {
          // If parsing fails, emit an error event but continue.
          // Parse başarısız olursa, bir error event'i yayınla ama devam et.
          yield {
            type: 'error',
            error: `Failed to parse Ollama chunk: ${(err as Error).message}`,
          };
          continue;
        }

        lastChunk = chunk;

        if (chunk.message && chunk.message.content) {
          const token = chunk.message.content;
          finalContent += token;
          yield {
            type: 'token',
            token,
          };
        }

        if (chunk.done) {
          const finalMessage: ChatMessage = {
            role: 'assistant',
            content: finalContent,
          };

          const usage = buildUsageFromChunk(chunk);

          yield {
            type: 'end',
            finalMessage,
            usage,
            providerMeta: chunk as unknown as Record<string, unknown>,
          };
          return;
        }
      }
    }

    // If stream ended without a `done` flag, still emit an end event.
    // Stream `done` bayrağı olmadan sona ererse, yine de bir end event'i yayınla.
    if (finalContent.length > 0) {
      const finalMessage: ChatMessage = {
        role: 'assistant',
        content: finalContent,
      };

      const usage = lastChunk ? buildUsageFromChunk(lastChunk) : undefined;

      yield {
        type: 'end',
        finalMessage,
        usage,
        providerMeta: lastChunk as unknown as Record<string, unknown> | undefined,
      };
    }
  } catch (err) {
    // If aborted via AbortSignal, treat it as a graceful end with no error.
    // AbortSignal ile iptal edilirse, hatasız zarif bir son olarak kabul et.
    if ((err as Error).name === 'AbortError') {
      return;
    }

    yield {
      type: 'error',
      error: (err as Error).message,
    };
  }
}
