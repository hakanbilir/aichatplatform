import { describe, it, expect, mock } from 'bun:test';
import { AnthropicProvider } from '../src/providers/anthropicProvider';

// Mock config
mock.module('@ai-chat/config', () => {
  return {
    getConfig: () => ({ ANTHROPIC_API_KEY: 'test-key' }),
  };
});

describe('AnthropicProvider', () => {
  it('should map multimodal messages correctly', () => {
    const provider = new AnthropicProvider();
    // Access private method via any cast
    const mapper = (provider as any).mapMessages.bind(provider);

    const messages = [
      { role: 'system' as any, content: 'You are a bot.' },
      {
        role: 'user' as any,
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'image', data: 'data:image/png;base64,abc' },
        ],
      },
    ];

    const result = mapper(messages);

    expect(result.system).toBe('You are a bot.');
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content).toHaveLength(2);
    expect(result.messages[0].content[0]).toEqual({ type: 'text', text: 'Hello' });
    expect(result.messages[0].content[1]).toEqual({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: 'abc',
      },
    });
  });
});
