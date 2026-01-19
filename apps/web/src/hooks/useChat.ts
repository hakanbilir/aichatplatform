import { useState, useRef, useCallback } from 'react';
import { streamMessage, regenerateMessage, StreamEvent } from '../api/chat';
import { ConversationDetails, getConversation, getConversationUsage, ConversationUsageSummary } from '../api/conversations';

export interface UseChatOptions {
  token: string | null;
  conversationId: string | null;
  conversation: ConversationDetails | null;
  setConversation: React.Dispatch<React.SetStateAction<ConversationDetails | null>>;
  onUsageUpdate?: (usage: ConversationUsageSummary) => void;
}

export function useChat({ token, conversationId, conversation, setConversation, onUsageUpdate }: UseChatOptions) {
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const refreshConversation = useCallback(async () => {
    if (!token || !conversationId) return;
    try {
      const [convResp, usageResp] = await Promise.all([
        getConversation(token, conversationId),
        getConversationUsage(token, conversationId).catch(() => null),
      ]);
      setConversation(convResp.conversation);
      if (usageResp && onUsageUpdate) {
        onUsageUpdate(usageResp);
      }
    } catch (err) {
      console.error('Failed to refresh conversation:', err);
    }
  }, [token, conversationId, setConversation, onUsageUpdate]);

  const handleStreamEvent = useCallback(
    (event: StreamEvent) => {
      if (event.type === 'token') {
        setStreamingText((prev) => prev + event.token);
      } else if (event.type === 'end' && event.message) {
        setStreamingText('');
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
                    meta: event.usage ? { usage: event.usage } : undefined,
                  },
                ],
              }
            : prev,
        );
      } else if (event.type === 'error') {
        console.error('Streaming error:', event.error);
        // Optionally handle error state
      }
    },
    [setConversation],
  );

  const sendMessage = useCallback(
    async (content: string, images?: string[], options?: { model?: string; temperature?: number; topP?: number }) => {
      if (!token || !conversationId || !conversation) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      // Optimistically append user message
      const userMessage = {
        id: `local-${Date.now()}`,
        role: 'USER',
        content,
        createdAt: new Date().toISOString(),
        meta: images ? { images } : undefined,
      };

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, userMessage],
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
            ...options,
          },
          handleStreamEvent,
          controller.signal,
        );
      } catch (err) {
        console.error('Send message error:', err);
      } finally {
        setStreaming(false);
        abortRef.current = null;
        // Refresh to get consistent IDs and DB state
        await refreshConversation();
      }
    },
    [token, conversationId, conversation, setConversation, handleStreamEvent, refreshConversation],
  );

  const regenerate = useCallback(async () => {
    if (!token || !conversationId || !conversation) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Determine if we need to clean up UI (remove last assistant message if exists?)
    // The backend removes messages AFTER the last user message.
    // So on frontend we should optimistically revert to state after last user message.

    // Find last user message index
    let lastUserIndex = -1;
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      if (conversation.messages[i].role === 'USER') {
        lastUserIndex = i;
        break;
      }
    }

    if (lastUserIndex === -1) return;

    // Remove anything after lastUserIndex
    const msgsToKeep = conversation.messages.slice(0, lastUserIndex + 1);

    setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: msgsToKeep,
            }
          : prev,
    );

    setStreamingText('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await regenerateMessage(
        token,
        conversationId,
        handleStreamEvent,
        controller.signal,
      );
    } catch (err) {
      console.error('Regenerate error:', err);
    } finally {
      setStreaming(false);
      abortRef.current = null;
      await refreshConversation();
    }

  }, [token, conversationId, conversation, setConversation, handleStreamEvent, refreshConversation]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
      // We might want to refresh to see what was partially saved, or just leave it
      refreshConversation();
    }
  }, [refreshConversation]);

  return {
    streaming,
    streamingText,
    sendMessage,
    regenerate,
    stop,
  };
}
