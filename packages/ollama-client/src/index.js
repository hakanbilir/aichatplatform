"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOllamaHealth = checkOllamaHealth;
exports.listOllamaModels = listOllamaModels;
exports.createChatCompletion = createChatCompletion;
exports.streamChatCompletion = streamChatCompletion;
const config_1 = require("@ai-chat/config");
const config = (0, config_1.getConfig)();
const OLLAMA_BASE_URL = config.OLLAMA_BASE_URL;
// =========================
// Utility mappers
// Yardımcı mapper'lar
// =========================
function mapMessagesToOllama(messages) {
    return messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));
}
function buildUsageFromChunk(chunk) {
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
async function checkOllamaHealth() {
    try {
        const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        return res.ok;
    }
    catch {
        return false;
    }
}
/**
 * List available Ollama models and map them to LlmModel objects.
 * Mevcut Ollama modellerini listeler ve LlmModel nesnelerine eşler.
 */
async function listOllamaModels() {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) {
        throw new Error(`Failed to fetch Ollama models: ${res.status} ${res.statusText}`);
    }
    const data = (await res.json());
    return data.models.map((m) => ({
        id: m.name,
        displayName: m.name,
        family: m.details?.family,
        // contextWindowTokens is unknown from tags API; can be enriched later
        // contextWindowTokens tags API'sinden bilinmiyor; daha sonra zenginleştirilebilir
        contextWindowTokens: undefined,
        isDefault: m.name === config.DEFAULT_MODEL,
    }));
}
/**
 * Perform a non-streaming chat completion via Ollama.
 *
 * NOTE: For most UI flows, streaming is preferred. This is a convenience wrapper.
 * Ollama üzerinden streaming olmayan chat completion gerçekleştirir.
 * NOT: Çoğu UI akışı için streaming tercih edilir. Bu bir kolaylık wrapper'ıdır.
 */
async function createChatCompletion(params) {
    const body = {
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
    const json = (await res.json());
    const message = {
        role: json.message.role,
        content: json.message.content,
    };
    const usage = buildUsageFromChunk(json);
    return {
        model: json.model,
        message,
        usage,
        providerMeta: json,
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
async function* streamChatCompletion(params) {
    const body = {
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
    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalContent = '';
    let lastChunk = null;
    try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed)
                    continue;
                let chunk;
                try {
                    chunk = JSON.parse(trimmed);
                }
                catch (err) {
                    // If parsing fails, emit an error event but continue.
                    // Parse başarısız olursa, bir error event'i yayınla ama devam et.
                    yield {
                        type: 'error',
                        error: `Failed to parse Ollama chunk: ${err.message}`,
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
                    const finalMessage = {
                        role: 'assistant',
                        content: finalContent,
                    };
                    const usage = buildUsageFromChunk(chunk);
                    yield {
                        type: 'end',
                        finalMessage,
                        usage,
                        providerMeta: chunk,
                    };
                    return;
                }
            }
        }
        // If stream ended without a `done` flag, still emit an end event.
        // Stream `done` bayrağı olmadan sona ererse, yine de bir end event'i yayınla.
        if (finalContent.length > 0) {
            const finalMessage = {
                role: 'assistant',
                content: finalContent,
            };
            const usage = lastChunk ? buildUsageFromChunk(lastChunk) : undefined;
            yield {
                type: 'end',
                finalMessage,
                usage,
                providerMeta: lastChunk,
            };
        }
    }
    catch (err) {
        // If aborted via AbortSignal, treat it as a graceful end with no error.
        // AbortSignal ile iptal edilirse, hatasız zarif bir son olarak kabul et.
        if (err.name === 'AbortError') {
            return;
        }
        yield {
            type: 'error',
            error: err.message,
        };
    }
}
//# sourceMappingURL=index.js.map