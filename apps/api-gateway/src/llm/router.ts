// apps/api-gateway/src/llm/router.ts

import { ChatCompletionRequest, LlmChatProvider, ChatCompletionResponse, ChatCompletionChunk } from './types';
import { OllamaChatProvider } from './providers/ollama';
// Future imports: OpenAIChatProvider, AnthropicChatProvider, etc.

let ollamaProvider: OllamaChatProvider | null = null;

export function initLlmProviders() {
  const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  ollamaProvider = new OllamaChatProvider({ baseUrl: ollamaBaseUrl });

  // In future: initialize other providers (OpenAI, Anthropic...) here.
}

function resolveProvider(modelProvider: string): LlmChatProvider {
  switch (modelProvider) {
    case 'ollama': {
      if (!ollamaProvider) {
        throw new Error('Ollama provider not initialized. Call initLlmProviders() first.');
      }
      return ollamaProvider;
    }
    // case 'openai': return openaiProvider;
    // case 'anthropic': return anthropicProvider;
    default:
      throw new Error(`Unsupported model provider: ${modelProvider}`);
  }
}

export async function completeWithRouting(
  req: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  const provider = resolveProvider(req.modelProvider);
  return provider.complete(req);
}

export function streamWithRouting(
  req: ChatCompletionRequest
): AsyncIterableIterator<ChatCompletionChunk> {
  const provider = resolveProvider(req.modelProvider);
  return provider.stream(req) as AsyncIterableIterator<ChatCompletionChunk>;
}
