import { ChatCompletionParams, ChatCompletionResponse, ChatStreamEvent, LlmModel } from '@ai-chat/core-types';
/**
 * Simple health check against Ollama.
 * Returns true if the /api/tags endpoint responds successfully.
 * Ollama'ya karşı basit sağlık kontrolü.
 * /api/tags endpoint'i başarıyla yanıt verirse true döner.
 */
export declare function checkOllamaHealth(): Promise<boolean>;
/**
 * List available Ollama models and map them to LlmModel objects.
 * Mevcut Ollama modellerini listeler ve LlmModel nesnelerine eşler.
 */
export declare function listOllamaModels(): Promise<LlmModel[]>;
/**
 * Perform a non-streaming chat completion via Ollama.
 *
 * NOTE: For most UI flows, streaming is preferred. This is a convenience wrapper.
 * Ollama üzerinden streaming olmayan chat completion gerçekleştirir.
 * NOT: Çoğu UI akışı için streaming tercih edilir. Bu bir kolaylık wrapper'ıdır.
 */
export declare function createChatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>;
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
export declare function streamChatCompletion(params: ChatCompletionParams & {
    signal?: AbortSignal;
}): AsyncGenerator<ChatStreamEvent, void, unknown>;
//# sourceMappingURL=index.d.ts.map