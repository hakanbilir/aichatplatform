import { useState, useCallback, useRef } from 'react';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
  createdAt?: string;
}

export interface UseChatOptions {
  conversationId: string | null;
  initialMessages?: ChatMessage[];
  onFinish?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface SendMessageOptions {
  model?: string;
  temperature?: number;
  topP?: number;
}

export function useChat({ conversationId, initialMessages = [], onFinish, onError }: UseChatOptions) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Streaming state
  const abortControllerRef = useRef<AbortController | null>(null);

  const setMessagesInternal = useCallback((newMessages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessages(newMessages);
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const append = useCallback(
    async (
      content: string,
      images?: string[],
      options?: SendMessageOptions
    ) => {
      if (!token || !conversationId) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        images,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        let assistantContent = '';
        const assistantMessageId = `assistant-${Date.now()}`;

        // Add optimistic assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
          },
        ]);

        await streamMessage(
          token,
          conversationId,
          {
            content,
            images,
            model: options?.model,
            temperature: options?.temperature,
            topP: options?.topP,
          },
          (event: StreamEvent) => {
            if (event.type === 'token') {
              assistantContent += event.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                )
              );
            } else if (event.type === 'end' && event.message) {
               // Ensure final content matches what server sent (optional, but good for consistency)
               // Note: 'end' event usually contains the full message or final chunk depending on implementation.
               // api/chat.ts logic accumulates content for 'end' event.
               setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: event.message.content } : m
                )
              );

              if (onFinish) {
                onFinish({
                    id: assistantMessageId,
                    role: 'assistant',
                    content: event.message.content,
                    createdAt: new Date().toISOString(),
                });
              }
            } else if (event.type === 'error') {
               throw new Error(event.error);
            }
          },
          controller.signal
        );
      } catch (err: any) {
        if (err.name === 'AbortError') {
            // User stopped generation
            return;
        }
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        if (onError) onError(e);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [token, conversationId, onFinish, onError]
  );

  const reload = useCallback(async (options?: SendMessageOptions) => {
      if (!token || !conversationId || messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'user') {
          // Retry last user message
          // Remove potential partial assistant message if exists (should not happen if we check role user)
          await append(lastMessage.content, lastMessage.images, options);
      } else if (lastMessage.role === 'assistant') {
          // Remove assistant message and retry previous user message
          const previousUserMessage = messages[messages.length - 2];
          if (previousUserMessage && previousUserMessage.role === 'user') {
             setMessages((prev) => prev.slice(0, -1)); // Remove assistant msg
             await append(previousUserMessage.content, previousUserMessage.images, options);
          }
      }
  }, [token, conversationId, messages, append]);

  return {
    messages,
    setMessages: setMessagesInternal,
    append,
    reload,
    stop,
    isLoading,
    error,
  };
}
