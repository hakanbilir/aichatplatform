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

// Optimization: Throttle updates to ~60fps using requestAnimationFrame
// Fallback to setTimeout for test environments
const requestFrame = (cb: () => void): any => {
  if (typeof requestAnimationFrame === 'function') {
    return requestAnimationFrame(cb);
  }
  return setTimeout(cb, 0);
};

const cancelFrame = (id: any) => {
  if (typeof cancelAnimationFrame === 'function') {
    cancelAnimationFrame(id);
  } else {
    clearTimeout(id);
  }
};

export function createStreamStore(): StreamStore {
  let state: StreamState = { content: '', thinking: '' };
  const listeners = new Set<() => void>();

  // Pending state for the next frame
  let pendingState: StreamState | null = null;
  let frameId: any = null;

  return {
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getSnapshot() {
      return state;
    },
    update(content: string, thinking: string) {
      pendingState = { content, thinking };

      // Schedule update if not already scheduled
      if (frameId === null) {
        frameId = requestFrame(() => {
          if (pendingState) {
            state = pendingState;
            pendingState = null;
          }
          frameId = null;
          listeners.forEach((l) => l());
        });
      }
    },
    reset() {
      if (frameId !== null) {
        cancelFrame(frameId);
        frameId = null;
      }
      pendingState = null;
      state = { content: '', thinking: '' };
      listeners.forEach((l) => l());
    },
  };
}
