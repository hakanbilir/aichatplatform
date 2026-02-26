// eslint-disable-next-line import/no-unresolved
import { describe, it, expect } from 'bun:test';

import { chatReducer, initialChatState, ChatState } from './chatReducer';

describe('chatReducer', () => {
  it('should return same state object on TOKEN action if status is already streaming', () => {
    const initialState: ChatState = {
      ...initialChatState,
      status: 'streaming',
    };

    const newState = chatReducer(initialState, { type: 'TOKEN', token: 'hello' });

    // Optimized behavior: return same state reference to prevent re-renders
    expect(newState).toBe(initialState);
  });

  it('should return new state object and update status on TOKEN action if status is NOT streaming', () => {
    const initialState: ChatState = {
      ...initialChatState,
      status: 'connecting',
    };

    const newState = chatReducer(initialState, { type: 'TOKEN', token: 'hello' });

    expect(newState).not.toBe(initialState);
    expect(newState.status).toBe('streaming');
  });

  it('should return same state object on THOUGHT_TOKEN action', () => {
    const initialState: ChatState = {
      ...initialChatState,
      status: 'streaming',
      isThinking: true,
    };

    const newState = chatReducer(initialState, { type: 'THOUGHT_TOKEN', token: 'thinking...' });

    expect(newState).toBe(initialState);
  });
});
