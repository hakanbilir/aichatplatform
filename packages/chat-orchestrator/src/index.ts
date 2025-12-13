import { getConfig } from '@ai-chat/config';
import {
  ChatCompletionParams,
  ChatCompletionResponse,
  ChatMessage,
  ChatStreamEvent,
  ChatRole,
  ToolDefinition,
} from '@ai-chat/core-types';
import {
  createChatCompletion as createOllamaChatCompletion,
  streamChatCompletion as streamOllamaChatCompletion,
} from '@ai-chat/ollama-client';

const config = getConfig();

// =========================
// Orchestrator Types
// =========================

/**
 * High-level context of a conversation known to the orchestrator.
 *
 * This is intentionally DB-agnostic: it does not include ORM types.
 * Orchestrator'ın bildiği bir konuşmanın üst düzey context'i.
 * Kasıtlı olarak DB-bağımsızdır: ORM tiplerini içermez.
 */
export interface ConversationContext {
  /**
   * A stable conversation identifier (may be a DB ID or transient ID).
   * Kararlı bir konuşma tanımlayıcısı (DB ID veya geçici ID olabilir).
   */
  id: string;
  /**
   * Optional title for logging / future use.
   * Loglama/gelecek kullanım için opsiyonel başlık.
   */
  title?: string;
  /**
   * System-level instructions for this conversation.
   * Bu konuşma için sistem seviyesi talimatlar.
   */
  systemPrompt?: string;
  /**
   * User-specific custom instructions.
   * Kullanıcıya özel özel talimatlar.
   */
  customInstructions?: string;
  /**
   * Historical messages for the conversation.
   * Konuşma için geçmiş mesajlar.
   */
  history: ChatMessage[];
}

/**
 * Options controlling how the orchestrator behaves.
 * Orchestrator'ın nasıl davranacağını kontrol eden seçenekler.
 */
export interface OrchestratorOptions {
  /**
   * Approximate maximum context size in tokens.
   * We will use a simple heuristic based on character length for now.
   * Token cinsinden yaklaşık maksimum context boyutu.
   * Şimdilik karakter uzunluğuna dayalı basit bir heuristik kullanacağız.
   */
  maxContextTokens: number;
}

/**
 * Parameters for a single chat run (one user message).
 * Tek bir chat çalıştırması için parametreler (bir kullanıcı mesajı).
 */
export interface ChatRunParams {
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /**
   * Optional tools available to the model.
   * Tools are not executed yet; this is for future extension.
   * Modele mevcut opsiyonel tool'lar.
   * Tool'lar henüz çalıştırılmıyor; bu gelecekteki genişleme için.
   */
  tools?: ToolDefinition[];
  /**
   * Optional AbortSignal to cancel streaming.
   * Streaming'i iptal etmek için opsiyonel AbortSignal.
   */
  signal?: AbortSignal;
}

/**
 * Internal options with defaults applied.
 * Varsayılanlarla uygulanmış dahili seçenekler.
 */
interface ResolvedChatRunParams extends ChatRunParams {
  model: string;
}

// =========================
// Helper Functions
// =========================

/**
 * Very rough heuristic to estimate token count from message content length.
 *
 * We assume ~4 characters per token as a simple rule of thumb.
 * Mesaj içerik uzunluğundan token sayısını tahmin etmek için çok kaba bir heuristik.
 * Basit bir kural olarak token başına ~4 karakter varsayıyoruz.
 */
function estimateTokens(text: string): number {
  const length = text.length;
  if (length === 0) return 0;
  return Math.max(1, Math.round(length / 4));
}

/**
 * Estimate approximate total tokens for a list of messages.
 * Bir mesaj listesi için yaklaşık toplam token'ları tahmin et.
 */
function estimateTotalTokens(messages: ChatMessage[]): number {
  return messages.reduce((sum, msg) => sum + estimateTokens(msg.content), 0);
}

/**
 * Trim messages so that the approximate token count does not exceed maxTokens.
 *
 * Oldest messages are removed first (from the beginning), keeping the latest messages + user input.
 * Yaklaşık token sayısı maxTokens'ı aşmayacak şekilde mesajları kırp.
 * En eski mesajlar önce kaldırılır (baştan), en son mesajlar + kullanıcı girdisi korunur.
 */
function trimMessagesToMaxTokens(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
  let result = [...messages];
  let total = estimateTotalTokens(result);

  // Keep at least the last message even if it exceeds max on its own.
  // En azından son mesajı kendisi max'ı aşsa bile koru.
  while (result.length > 1 && total > maxTokens) {
    result.shift();
    total = estimateTotalTokens(result);
  }

  return result;
}

/**
 * Build the final message list to send to the LLM from:
 * - Conversation system prompt
 * - User custom instructions
 * - Conversation history
 * - Current user message
 * LLM'e gönderilecek son mesaj listesini oluştur:
 * - Konuşma sistem prompt'u
 * - Kullanıcı özel talimatları
 * - Konuşma geçmişi
 * - Mevcut kullanıcı mesajı
 */
export function buildPromptMessages(context: ConversationContext, userMessage: ChatMessage): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (context.systemPrompt) {
    messages.push({
      role: 'system',
      content: context.systemPrompt,
    });
  }

  if (context.customInstructions) {
    messages.push({
      role: 'system',
      content: context.customInstructions,
      name: 'custom_instructions',
    });
  }

  // Append existing history
  // Mevcut geçmişi ekle
  for (const msg of context.history) {
    messages.push(msg);
  }

  // Append the new user message
  // Yeni kullanıcı mesajını ekle
  messages.push(userMessage);

  return messages;
}

/**
 * Apply default values to ChatRunParams using config defaults.
 * Config varsayılanlarını kullanarak ChatRunParams'a varsayılan değerleri uygula.
 */
function resolveChatRunParams(params: ChatRunParams): ResolvedChatRunParams {
  return {
    model: params.model ?? config.DEFAULT_MODEL,
    temperature: params.temperature ?? 0.7,
    topP: params.topP ?? 1,
    maxTokens: params.maxTokens,
    tools: params.tools,
    signal: params.signal,
  };
}

// =========================
// Orchestrated Non-Streaming Chat
// =========================

/**
 * Run a non-streaming chat completion through Ollama.
 *
 * Use this for background jobs or where streaming is not required.
 * Ollama üzerinden streaming olmayan chat completion çalıştır.
 * Arka plan işleri veya streaming'in gerekli olmadığı yerler için kullan.
 */
export async function runChatCompletion(
  context: ConversationContext,
  userMessage: ChatMessage,
  options: OrchestratorOptions,
  params: ChatRunParams = {},
): Promise<ChatCompletionResponse> {
  const resolvedParams = resolveChatRunParams(params);

  const allMessages = buildPromptMessages(context, userMessage);
  const trimmed = trimMessagesToMaxTokens(allMessages, options.maxContextTokens);

  const completionParams: ChatCompletionParams = {
    model: resolvedParams.model,
    messages: trimmed,
    temperature: resolvedParams.temperature,
    topP: resolvedParams.topP,
    maxTokens: resolvedParams.maxTokens,
    tools: resolvedParams.tools,
  };

  const result = await createOllamaChatCompletion(completionParams);
  return result;
}

// =========================
// Orchestrated Streaming Chat
// =========================

/**
 * Orchestrated streaming chat.
 *
 * This wraps `streamOllamaChatCompletion` and is responsible for:
 * - Building and trimming the prompt messages.
 * - Forwarding streaming events.
 * - Ensuring at least one `start` and one `end` or `error` event.
 * Orchestre edilmiş streaming chat.
 * `streamOllamaChatCompletion`'ı sarar ve şunlardan sorumludur:
 * - Prompt mesajlarını oluşturma ve kırpma.
 * - Streaming event'lerini iletme.
 * - En az bir `start` ve bir `end` veya `error` event'i sağlama.
 */
export async function* streamChatCompletionOrchestrated(
  context: ConversationContext,
  userMessage: ChatMessage,
  options: OrchestratorOptions,
  params: ChatRunParams = {},
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  const resolvedParams = resolveChatRunParams(params);

  const allMessages = buildPromptMessages(context, userMessage);
  const trimmed = trimMessagesToMaxTokens(allMessages, options.maxContextTokens);

  const completionParams: ChatCompletionParams & { signal?: AbortSignal } = {
    model: resolvedParams.model,
    messages: trimmed,
    temperature: resolvedParams.temperature,
    topP: resolvedParams.topP,
    maxTokens: resolvedParams.maxTokens,
    tools: resolvedParams.tools,
    signal: resolvedParams.signal,
  };

  let started = false;
  let endedOrErrored = false;

  try {
    for await (const event of streamOllamaChatCompletion(completionParams)) {
      if (!started) {
        // Ensure a single 'start' event is emitted once at the beginning.
        // Başlangıçta bir kez tek bir 'start' event'inin yayınlandığından emin ol.
        started = true;
        yield { type: 'start' };
      }

      // Forward events from the underlying client, but normalize types if needed.
      // Altta yatan client'tan event'leri ilet, ancak gerekirse tipleri normalize et.
      if (event.type === 'start') {
        // Ignore underlying start; we've already emitted our own.
        // Altta yatan start'ı yoksay; zaten kendi start'ımızı yayınladık.
        continue;
      }

      if (event.type === 'token' || event.type === 'end' || event.type === 'error') {
        if (event.type === 'end' || event.type === 'error') {
          endedOrErrored = true;
        }
        yield event;
      }
    }

    if (!started) {
      // If underlying stream produced no events, still emit a start.
      // Altta yatan stream hiç event üretmediyse, yine de bir start yayınla.
      started = true;
      yield { type: 'start' };
    }

    if (!endedOrErrored) {
      // Ensure an 'end' event if none was emitted.
      // Hiçbiri yayınlanmadıysa bir 'end' event'i sağla.
      const fallbackMessage: ChatMessage = {
        role: 'assistant',
        content: '',
      };
      yield {
        type: 'end',
        finalMessage: fallbackMessage,
      };
    }
  } catch (err) {
    if (!started) {
      yield { type: 'start' };
      started = true;
    }

    const errorMessage = (err as Error).message ?? 'Unknown error during streaming chat';
    yield {
      type: 'error',
      error: errorMessage,
    };
  }
}

// =========================
// Convenience: Create a user message
// =========================

/**
 * Helper to create a user message from plain text.
 * Düz metinden bir kullanıcı mesajı oluşturmak için yardımcı.
 */
export function createUserMessage(content: string): ChatMessage {
  const msg: ChatMessage = {
    role: 'user' as ChatRole,
    content,
  };
  return msg;
}
