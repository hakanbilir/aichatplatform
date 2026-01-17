import { useState, useCallback, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { apiRequest } from '../api/client';
import { sendMessage, streamMessage, StreamEvent } from '../api/chat';
import { ChatMessage, ChatRole } from '@ai-chat/core-types';

export interface UseChatOptions {
  conversationId: string;
  onMessageComplete?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export interface SendMessageOptions {
  content?: string;
  images?: string[];
  model?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  role?: 'user' | 'tool';
  name?: string;
}

export function useChat({ conversationId, onMessageComplete, onError }: UseChatOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { data: conversationData, mutate: mutateConversation } = useSWR(
    conversationId ? `/conversations/${conversationId}` : null
  );

  const messages: ChatMessage[] = conversationData?.messages?.map((m: any) => ({
    id: m.id,
    role: m.role.toLowerCase() as ChatRole,
    content: m.content,
    images: m.meta?.images,
    toolCalls: m.meta?.toolCalls,
    createdAt: m.createdAt,
  })) || [];

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  const send = useCallback(
    async (options: SendMessageOptions) => {
      if (!conversationId) return;

      const { content = '', images, model, temperature, topP, maxTokens, role, name } = options;

      if (!content && (!images || images.length === 0)) {
        return;
      }

      setError(null);
      setIsStreaming(true);

      // Optimistic update
      const optimisticUserMessage: ChatMessage = {
        role: role === 'tool' ? 'tool' : 'user',
        content,
        images,
        name,
        createdAt: new Date().toISOString(),
      };

      const optimisticAssistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      };

      // We don't have IDs yet, so we use temporary ones or just rely on index/position
      // But better to let SWR handle mutation with the optimistic data structure
      // For now, let's just trigger streaming.
      // Ideally we would update the local cache immediately.

      const token = localStorage.getItem('token') || '';
      if (!token) {
        setError(new Error('No auth token found'));
        setIsStreaming(false);
        return;
      }

      abortControllerRef.current = new AbortController();

      try {
        let accumulatedContent = '';

        // Add optimistic user message to local cache if possible or just rely on revalidation
        // For smoother UX, we can maintain a local "pending" state or modify the SWR cache.
        // But simply, let's track the streaming assistant message.
        // Ideally, we append the user message and a placeholder assistant message to `messages`.
        // Since `messages` is derived from `conversationData`, we can't easily mutate it directly without SWR mutation.

        // Let's mutate SWR locally first for the user message
        await mutateConversation(
          (currentData: any) => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              messages: [
                ...currentData.messages,
                {
                  id: 'optimistic-user-' + Date.now(),
                  role: role === 'tool' ? 'TOOL' : 'USER',
                  content,
                  meta: { images, name },
                  createdAt: new Date().toISOString(),
                },
                {
                  id: 'optimistic-assistant-' + Date.now(),
                  role: 'ASSISTANT',
                  content: '', // placeholder
                  createdAt: new Date().toISOString(),
                  isStreaming: true, // Special flag for UI to know it's loading/streaming
                }
              ]
            };
          },
          false // do not revalidate yet
        );

        await streamMessage(
          token,
          conversationId,
          { content, images, model, temperature, topP, maxTokens, role, name },
          (event: StreamEvent) => {
            if (event.type === 'token') {
              accumulatedContent += event.token;

              // Update the last message (assistant) with accumulated content
              mutateConversation(
                (currentData: any) => {
                  if (!currentData || !currentData.messages.length) return currentData;
                  const msgs = [...currentData.messages];
                  const lastMsg = msgs[msgs.length - 1];
                  if (lastMsg.role === 'ASSISTANT') {
                     lastMsg.content = accumulatedContent;
                  }
                  return {
                    ...currentData,
                    messages: msgs
                  };
                },
                false
              );

            } else if (event.type === 'end') {
              if (onMessageComplete && event.message) {
                 const completedMsg: ChatMessage = {
                    role: event.message.role as ChatRole,
                    content: event.message.content,
                    toolCalls: event.message.toolCalls,
                 };
                 onMessageComplete(completedMsg);
              }
            } else if (event.type === 'error') {
               console.error('Stream error:', event.error);
               setError(new Error(event.error));
            }
          },
          abortControllerRef.current.signal
        );

        // After stream is done, revalidate completely to get canonical DB state
        await mutateConversation();

      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err);
          onError?.(err);
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [conversationId, mutateConversation, onMessageComplete, onError]
  );

  const regenerate = useCallback(async () => {
      // Logic to get last user message and re-send it
      // This requires backend support to "delete" or "ignore" subsequent messages
      // OR we just send a new request that branches off.
      // Current backend append-only structure makes "true" regeneration hard without "forking".
      // For now, simpler approach: just re-send the last user message content as a new message?
      // No, that's not regeneration.
      // Proper regeneration usually requires sending the history up to the last user message.
      // Backend `runChatCompletion` takes a context.
      // If we want to regenerate, we probably need a new endpoint or a flag.
      // Given constraints, I'll skip implementing 'regenerate' for now as it needs backend architectural changes (deleting messages or forking).
      console.warn("Regenerate not fully implemented due to backend constraints");
  }, []);

  return {
    messages,
    isLoading: !conversationData && !error,
    isStreaming,
    error,
    sendMessage: send,
    stopGeneration,
    // regenerate // omitted for now
  };
}
