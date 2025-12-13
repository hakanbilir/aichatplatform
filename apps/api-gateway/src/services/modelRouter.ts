// apps/api-gateway/src/services/modelRouter.ts

import { ModelConfig } from '../config/models';
import { ModelProvider } from '../providers/base';
import { OllamaProvider } from '../providers/ollamaProvider';

export function getProviderForModel(config: ModelConfig): ModelProvider {
  switch (config.provider) {
    case 'ollama':
      return new OllamaProvider();
    // case 'openai':
    //   return new OpenAIProvider();
    // case 'local':
    //   return new LocalProvider();
    default:
      return new OllamaProvider();
  }
}

