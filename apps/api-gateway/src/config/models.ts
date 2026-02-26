// apps/api-gateway/src/config/models.ts

export type ModelProviderId = 'ollama' | 'openai' | 'anthropic' | 'local';

export interface ModelConfig {
  /** Fully qualified id as used by clients & Conversation.model, e.g. "ollama:llama3" */
  id: string;
  /** Provider family */
  provider: ModelProviderId;
  /** Human-friendly label for UI */
  label: string;
  /** Underlying model name used by the provider (e.g. ollama model name) */
  providerModel: string;
  /** Default temperature if conversation.temperature is null */
  defaultTemperature: number;
  /** Whether the model supports tools / function calling (future extension) */
  supportsTools: boolean;
}

/**
 * Default model registry. In a real system this could be loaded from DB/config center.
 */
export const MODEL_REGISTRY: ModelConfig[] = [
  {
    id: 'ollama:llama3.1',
    provider: 'ollama',
    label: 'Llama 3.1 (Ollama)',
    providerModel: 'llama3.1',
    defaultTemperature: 0.7,
    supportsTools: false,
  },
  {
    id: 'ollama:llama3.1:8b',
    provider: 'ollama',
    label: 'Llama 3.1 8B (Ollama)',
    providerModel: 'llama3.1:8b',
    defaultTemperature: 0.7,
    supportsTools: false,
  },
  {
    id: 'ollama:qwen2.5-coder',
    provider: 'ollama',
    label: 'Qwen2.5 Coder (Ollama)',
    providerModel: 'qwen2.5-coder',
    defaultTemperature: 0.7,
    supportsTools: false,
  },
  {
    id: 'ollama:phi3',
    provider: 'ollama',
    label: 'Phi-3 (Ollama)',
    providerModel: 'phi3',
    defaultTemperature: 0.7,
    supportsTools: false,
  },
  {
    id: 'openai:gpt-4o',
    provider: 'openai',
    label: 'GPT-4o (OpenAI)',
    providerModel: 'gpt-4o',
    defaultTemperature: 0.7,
    supportsTools: true,
  },
  {
    id: 'openai:gpt-4o-mini',
    provider: 'openai',
    label: 'GPT-4o Mini (OpenAI)',
    providerModel: 'gpt-4o-mini',
    defaultTemperature: 0.7,
    supportsTools: true,
  },
  {
    id: 'openai:o1-preview',
    provider: 'openai',
    label: 'o1 Preview (Reasoning)',
    providerModel: 'o1-preview',
    defaultTemperature: 1.0,
    supportsTools: true,
  },
  {
    id: 'anthropic:claude-3-5-sonnet-20240620',
    provider: 'anthropic',
    label: 'Claude 3.5 Sonnet',
    providerModel: 'claude-3-5-sonnet-20240620',
    defaultTemperature: 0.7,
    supportsTools: true,
  },
  {
    id: 'anthropic:claude-3-opus-20240229',
    provider: 'anthropic',
    label: 'Claude 3 Opus',
    providerModel: 'claude-3-opus-20240229',
    defaultTemperature: 0.7,
    supportsTools: true,
  },
  {
    id: 'anthropic:claude-3-haiku-20240307',
    provider: 'anthropic',
    label: 'Claude 3 Haiku',
    providerModel: 'claude-3-haiku-20240307',
    defaultTemperature: 0.7,
    supportsTools: true,
  },
  // You can extend this registry with openai:*, local:* etc.
];

export const DEFAULT_MODEL_ID = 'ollama:llama3.1';

export function resolveModelId(raw: string | null | undefined): string {
  if (!raw || raw === 'default') {
    return DEFAULT_MODEL_ID;
  }

  if (raw.includes(':')) {
    return raw;
  }

  // No provider prefix: assume Ollama by default
  return `ollama:${raw}`;
}

export function getModelConfig(effectiveId: string): ModelConfig {
  const found = MODEL_REGISTRY.find((m) => m.id === effectiveId);
  if (found) return found;

  // Fallback: if the id looks like "provider:key", synthesize a config
  const parts = effectiveId.split(':', 2);
  const provider = (parts[0] || 'ollama') as ModelProviderId;
  const key = parts[1] || effectiveId;

  return {
    id: effectiveId,
    provider,
    label: effectiveId,
    providerModel: key,
    defaultTemperature: 0.7,
    supportsTools: false,
  };
}
