
export interface StreamState {
  content: string;
  thinking: string;
}

export interface StreamStore {
  subscribe: (callback: () => void) => () => void;
  getSnapshot: () => StreamState;
  update: (content: string, thinking: string) => void;
  reset: () => void;
}

export function createStreamStore(): StreamStore {
  let state: StreamState = { content: '', thinking: '' };
  const listeners = new Set<() => void>();

  return {
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot() {
      return state;
    },
    update(content: string, thinking: string) {
      state = { content, thinking };
      listeners.forEach((l) => l());
    },
    reset() {
      state = { content: '', thinking: '' };
      listeners.forEach((l) => l());
    },
  };
}
