// apps/api-gateway/src/services/modelRouter.ts

import { ModelConfig } from '../config/models';
import { ModelProvider } from '../providers/base';
import { OllamaProvider } from '../providers/ollamaProvider';
import { OpenAIProvider } from '../providers/openaiProvider';
import { AnthropicProvider } from '../providers/anthropicProvider';

export function getProviderForModel(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider();
    case 'openai':
      return new OpenAIProvider();
    case 'anthropic':
      return new AnthropicProvider();
    // case 'local':
    //   return new LocalProvider();
    default:
      return new OllamaProvider();
  }
}
