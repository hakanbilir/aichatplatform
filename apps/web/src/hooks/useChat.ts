import { useState, useRef, useCallback } from 'react';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';

export interface UseChatOptions {
  onMessageStart?: () => void;
  onMessageStream?: (token: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMessageEnd?: (message: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (error: any) => void;
}

export function useChat() {
  const { token } = useAuth();
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    conversationId: string,
    content: string,
    options: { model?: string; temperature?: number; topP?: number } = {},
    callbacks?: UseChatOptions
  ) => {
    if (!token) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setStreaming(true);
    setStreamingText('');
    callbacks?.onMessageStart?.();

    try {
      await streamMessage(
        token,
        conversationId,
        {
          content,
          ...options
        },
        (event: StreamEvent) => {
          if (event.type === 'token') {
            setStreamingText((prev) => prev + event.token);
            callbacks?.onMessageStream?.(event.token);
          }

          if (event.type === 'end' && event.message) {
            setStreamingText('');
            callbacks?.onMessageEnd?.(event.message);
          }

          if (event.type === 'error') {
              callbacks?.onError?.(event.error);
          }
        },
        controller.signal
      );
    } catch (err) {
       // AbortError is expected when cancelling
       if ((err as Error).name !== 'AbortError') {
         callbacks?.onError?.(err);
       }
    } finally {
      // Only set streaming to false if this is the active controller
      if (abortRef.current === controller) {
        setStreaming(false);
        abortRef.current = null;
      }
    }
  }, [token]);

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, []);

  return {
    sendMessage,
    cancel,
    streaming,
    streamingText,
  };
}
