// Global, runtime-agnostic types shared across the AI chat platform.
// These types are used by API, chat orchestrator, Ollama client, tools engine, and workers.
// Platform genelinde paylaşılan, runtime-bağımsız tipler.
// Bu tipler API, chat orchestrator, Ollama client, tools engine ve worker'lar tarafından kullanılır.

// =========================
// Chat Roles & Messages
// =========================

/**
 * Chat roles used in the LLM conversation.
 * Must stay in sync with:
 * - MessageRole enum in Prisma schema
 * - Any OpenAI-like / Ollama mapping
 * LLM konuşmasında kullanılan chat rolleri.
 * Prisma şemasındaki MessageRole enum'u ile senkronize olmalıdır.
 */
export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * Minimal representation of a message exchanged with the LLM.
 *
 * id, createdAt, and meta are optional and may be filled when persisted to DB.
 * LLM ile değiş tokuş edilen mesajın minimal temsili.
 * id, createdAt ve meta opsiyoneldir ve DB'ye kaydedildiğinde doldurulabilir.
 */
export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  /**
   * Optional display name (e.g., function/tool name for tool role).
   * Opsiyonel görünen ad (ör. tool rolü için fonksiyon/tool adı).
   */
  name?: string;
  /**
   * Metadata for internal use (e.g., references, tool call info, debug info).
   * Dahili kullanım için metadata (ör. referanslar, tool çağrı bilgisi, debug bilgisi).
   */
  meta?: Record<string, unknown>;
  /**
   * Optional ISO timestamp.
   * Opsiyonel ISO zaman damgası.
   */
  createdAt?: string;
}

// =========================
// Tools (Function Calling)
// =========================

/**
 * JSON Schema-like definition for a tool's parameters.
 * We keep this as `unknown` to avoid coupling with a specific schema library.
 * Bir tool'un parametreleri için JSON Schema benzeri tanım.
 * Belirli bir schema kütüphanesine bağlı kalmamak için `unknown` olarak tutuyoruz.
 */
export type JsonSchema = unknown;

/**
 * A callable tool (function) the LLM can request to use.
 * LLM'in kullanmak isteyebileceği çağrılabilir tool (fonksiyon).
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchema;
  /**
   * If false, tool is disabled (per org or globally).
   * false ise, tool devre dışıdır (org bazında veya global olarak).
   */
  enabled: boolean;
}

/**
 * A tool call request from the LLM.
 * For now this is a generic structure that can be mapped to concrete tool calls later.
 * LLM'den gelen bir tool çağrı isteği.
 * Şimdilik daha sonra somut tool çağrılarına eşlenebilecek genel bir yapı.
 */
export interface ToolCall {
  toolName: string;
  /** Raw arguments JSON as produced by the LLM. */
  /** LLM tarafından üretilen ham argümanlar JSON'u. */
  argsJson: string;
}

/**
 * The result of executing a tool.
 * Bir tool'un çalıştırılmasının sonucu.
 */
export interface ToolResult {
  toolName: string;
  /**
   * The raw JSON-serializable result returned by the tool.
   * Tool tarafından döndürülen ham JSON-serializable sonuç.
   */
  data: unknown;
  /**
   * Optional error message if tool execution failed.
   * Tool çalıştırması başarısız olursa opsiyonel hata mesajı.
   */
  error?: string;
}

// =========================
// Model Metadata
// =========================

export interface LlmModel {
  /**
   * The ID used when calling the model (e.g., "llama3.1").
   * Model çağrılırken kullanılan ID (ör. "llama3.1").
   */
  id: string;
  /**
   * Human-friendly display name.
   * İnsan dostu görünen ad.
   */
  displayName: string;
  /**
   * Short family identifier (e.g., "llama", "qwen").
   * Kısa aile tanımlayıcısı (ör. "llama", "qwen").
   */
  family?: string;
  /**
   * Approximate context window in tokens.
   * Token cinsinden yaklaşık context penceresi.
   */
  contextWindowTokens?: number;
  /**
   * Is this model suitable as a default general-purpose chat model?
   * Bu model varsayılan genel amaçlı chat modeli olarak uygun mu?
   */
  isDefault?: boolean;
}

// =========================
// Chat Requests & Responses
// =========================

/**
 * Parameters for a chat completion request.
 *
 * Tools are optional and will be integrated by the orchestrator.
 * Chat completion isteği için parametreler.
 * Tool'lar opsiyoneldir ve orchestrator tarafından entegre edilecektir.
 */
export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  /**
   * Tools available for this request.
   * Bu istek için mevcut tool'lar.
   */
  tools?: ToolDefinition[];
}

/**
 * Token usage metadata for a request/response cycle.
 * Bir istek/yanıt döngüsü için token kullanım metadata'sı.
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * Non-streaming chat completion response.
 * Streaming olmayan chat completion yanıtı.
 */
export interface ChatCompletionResponse {
  model: string;
  message: ChatMessage;
  usage?: TokenUsage;
  /**
   * Optional raw provider-specific metadata.
   * Opsiyonel ham provider-spesifik metadata.
   */
  providerMeta?: Record<string, unknown>;
}

// =========================
// Streaming Types
// =========================

export type ChatStreamEventType = 'start' | 'token' | 'end' | 'error';

/**
 * A single streaming event emitted during a chat completion.
 * Chat completion sırasında yayınlanan tek bir streaming event'i.
 */
export interface ChatStreamEvent {
  type: ChatStreamEventType;
  /**
   * For `token` events, this is the incremental token content.
   * `token` event'leri için, bu artımlı token içeriğidir.
   */
  token?: string;
  /**
   * For `end` events, the final accumulated message (if available).
   * `end` event'leri için, son birikmiş mesaj (varsa).
   */
  finalMessage?: ChatMessage;
  /**
   * Optional error message for `error` events.
   * `error` event'leri için opsiyonel hata mesajı.
   */
  error?: string;
  /**
   * Optional usage details (usually provided at the end).
   * Opsiyonel kullanım detayları (genellikle sonunda sağlanır).
   */
  usage?: TokenUsage;
  /**
   * Provider-specific metadata, if any.
   * Provider-spesifik metadata, varsa.
   */
  providerMeta?: Record<string, unknown>;
}

// =========================
// Export Types
// =========================

/**
 * Supported formats for conversation exports.
 * Konuşma dışa aktarımları için desteklenen formatlar.
 */
export type ConversationExportFormat = 'jsonl' | 'markdown' | 'html';
