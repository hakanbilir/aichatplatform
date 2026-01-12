import { useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { streamMessage, StreamEvent } from '../api/chat';
import {
  getConversation,
  getConversationUsage,
  ConversationDetails,
  ConversationUsageSummary,
  updateConversation,
} from '../api/conversations';
import { ChatMessage } from '@ai-chat/core-types';

interface UseChatOptions {
  conversationId: string | null;
  onConversationUpdated?: (conversation: ConversationDetails) => void;
  onUsageUpdated?: (usage: ConversationUsageSummary) => void;
}

export function useChat({ conversationId, onConversationUpdated, onUsageUpdated }: UseChatOptions) {
  const { token } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load conversation details
  useEffect(() => {
    if (!token || !conversationId) {
      setConversation(null);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!token || !conversationId) return;
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, conversationId),
          getConversationUsage(token, conversationId).catch(() => null),
        ]);
        if (!cancelled) {
          setConversation(convResp.conversation);
          onConversationUpdated?.(convResp.conversation);
          if (usageResp) {
            onUsageUpdated?.(usageResp);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message);
          setConversation(null);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  const sendMessage = useCallback(
    async (content: string, images?: string[], options?: { model?: string; temperature?: number; topP?: number }) => {
      if (!token || !conversationId || !conversation) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      setError(null);

      // Optimistic update
      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: 'user',
        content,
        images,
        createdAt: new Date().toISOString(),
      };

      // Convert ChatMessage to the format expected by ConversationDetails (which likely uses database types or similar)
      // Since ConversationDetails.messages type might differ, we cast or adapt.
      // Based on ChatPage.tsx, it pushes to messages array.

      const optimisticMessage: any = {
          ...userMessage,
          role: 'USER', // Map to DB role expected by UI? ChatView uses whatever is passed.
          // In ChatPage.tsx, it uses 'USER' (uppercase).
      };

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, optimisticMessage],
            }
          : prev,
      );

      setStreamingText('');
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        await streamMessage(
          token,
          conversationId,
          {
            content,
            images,
            model: options?.model ?? conversation.model ?? 'llama3.1',
            temperature: options?.temperature ?? conversation.temperature ?? 0.7,
            topP: options?.topP ?? conversation.topP ?? 1,
          },
          (event: StreamEvent) => {
            if (event.type === 'token') {
              setStreamingText((prev) => prev + event.token);
            } else if (event.type === 'end' && event.message) {
              setStreamingText('');
              // Append assistant message
               setConversation((prev) =>
                prev
                  ? {
                      ...prev,
                      messages: [
                        ...prev.messages,
                        {
                          id: `assistant-${Date.now()}`,
                          role: 'ASSISTANT',
                          content: event.message.content,
                          createdAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : prev,
              );
            } else if (event.type === 'error') {
               setError(event.error);
            }
          },
          controller.signal,
        );
      } catch (err: any) {
         if (err.name !== 'AbortError') {
             setError(err.message);
         }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }

       // Refresh state to ensure consistency
       if (token && conversationId) {
        try {
            const [convResp, usageResp] = await Promise.all([
            getConversation(token, conversationId),
            getConversationUsage(token, conversationId).catch(() => null),
            ]);
            setConversation(convResp.conversation);
            onConversationUpdated?.(convResp.conversation);
            if (usageResp) {
               onUsageUpdated?.(usageResp);
            }
        } catch {
            // ignore background refresh errors
        }
       }
    },
    [token, conversationId, conversation, onConversationUpdated, onUsageUpdated],
  );

  const updateSettings = useCallback(async (settings: { model?: string; temperature?: number; topP?: number }) => {
      if (!token || !conversationId) return;

      const resp = await updateConversation(token, conversationId, settings);
      setConversation((prev) => prev ? {
          ...prev,
          model: resp.conversation.model,
          temperature: resp.conversation.temperature,
          topP: resp.conversation.topP,
      } : prev);
      onConversationUpdated?.(resp.conversation);
  }, [token, conversationId, onConversationUpdated]);

  return {
    conversation,
    streamingText,
    streaming,
    error,
    sendMessage,
    updateSettings,
    setConversation // Allow manual updates if needed
  };
}
