import { EventEmitter } from 'events';

// Singleton event emitter for local process communication
// Used for SSE/WebSocket broadcasting within the same instance
class LocalEmitter extends EventEmitter {}

export const localEmitter = new LocalEmitter();
