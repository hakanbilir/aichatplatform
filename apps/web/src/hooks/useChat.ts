import { useState, useCallback, useRef } from 'react';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';
import { ChatMessage, ToolCall } from '@ai-chat/core-types';

export interface UseChatOptions {
  conversationId: string;
  initialMessages?: ChatMessage[];
  onFinish?: () => void;
  onError?: (error: Error) => void;
}

export function useChat({ conversationId, initialMessages = [], onFinish, onError }: UseChatOptions) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, images?: string[]) => {
      if (!token) return;

      setIsLoading(true);
      setError(null);

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        images,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // Placeholder for assistant message
      const assistantMessageId = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let assistantContent = '';
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      abortControllerRef.current = new AbortController();

      try {
        await streamMessage(
          token,
          conversationId,
          { content, images },
          (event: StreamEvent) => {
            if (event.type === 'token') {
              assistantContent += event.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId ? { ...m, content: assistantContent } : m
                )
              );
            } else if (event.type === 'end') {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: event.message.content, meta: { usage: event.usage } }
                    : m
                )
              );
              if (onFinish) onFinish();
            } else if (event.type === 'tool_call') {
               // Parse arguments and standardize to ToolCall
               const toolCall: ToolCall = {
                 id: event.toolCall.id,
                 name: event.toolCall.name,
                 arguments: event.toolCall.arguments,
               };

               setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? {
                        ...m,
                        toolCalls: [...(m.toolCalls || []), toolCall]
                      }
                    : m
                )
              );
            } else if (event.type === 'error') {
              setError(event.error);
              if (onError) onError(new Error(event.error));
            }
          },
          abortControllerRef.current.signal
        );
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          const errMsg = (err as Error).message;
          setError(errMsg);
          if (onError) onError(err as Error);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [token, conversationId, onFinish, onError]
  );

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    setMessages,
    sendMessage,
    isLoading,
    error,
    stop,
  };
}
