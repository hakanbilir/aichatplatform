import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConversation,
  getConversationUsage,
  deleteMessage,
  ConversationDetails,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';

export interface UseChatOptions {
  conversationId: string | null;
  onBeforeSend?: () => void;
  onError?: (error: Error) => void;
}

export function useChat({ conversationId, onBeforeSend, onError }: UseChatOptions) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [thinkingText, setThinkingText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Queries
  const { data: conversationData, isLoading: isLoadingConversation, refetch: refetchConversation } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => token && conversationId ? getConversation(token, conversationId) : null,
    enabled: !!token && !!conversationId,
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: usageData } = useQuery({
    queryKey: ['conversation-usage', conversationId],
    queryFn: () => token && conversationId ? getConversationUsage(token, conversationId) : null,
    enabled: !!token && !!conversationId,
  });

  const conversation = conversationData?.conversation || null;
  const usage = usageData || null;

  // Optimistic messages handling
  const [optimisticMessages, setOptimisticMessages] = useState<ConversationDetails['messages']>([]);

  // Sync optimistic messages with server data
  useEffect(() => {
    if (conversation?.messages) {
      setOptimisticMessages(conversation.messages);
    }
  }, [conversation]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (content: string, images?: string[], options?: { model?: string; temperature?: number; topP?: number }) => {
    if (!token || !conversationId) return;

    if (onBeforeSend) onBeforeSend();
    stop(); // Stop any pending stream

    const userMessageId = `local-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'USER',
      content,
      images,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    setOptimisticMessages((prev) => [...prev, userMessage]);
    setStreamingText('');
    setThinkingText('');
    setIsThinking(false);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        token,
        conversationId,
        {
          content,
          images,
          ...options
        },
        (event: StreamEvent) => {
           if (event.type === 'token') {
            setToolStatus(null);
            // If we receive a token, we are done thinking (if we were)
            // But usually thought_end comes before token.
            // Just in case:
            if (isThinking) setIsThinking(false);
            setStreamingText((prev) => prev + event.token);
          } else if (event.type === 'thought_start') {
             setIsThinking(true);
             setThinkingText('');
          } else if (event.type === 'thought_token') {
             setThinkingText((prev) => prev + event.token);
          } else if (event.type === 'thought_end') {
             setIsThinking(false);
          } else if (event.type === 'tool_start') {
            setToolStatus(`Using tool: ${event.toolName}...`);
          } else if (event.type === 'tool_end') {
             // Keep status or clear? Usually clear when tokens start, or immediately.
             // If we clear immediately, it might flash too fast.
             // But 'token' event clears it.
          } else if (event.type === 'end') {
            setStreamingText('');
            setThinkingText('');
            setIsThinking(false);
            setToolStatus(null);
            // The final message is handled by invalidation mostly, but we can append it optimistically if we want smooth transition
            // However, usually 'end' event means backend has saved it.
            // But to avoid flicker until revalidation, we can append it.
             if (event.finalMessage) {
                 setOptimisticMessages((prev) => [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: 'ASSISTANT',
                    content: event.finalMessage!.content,
                    createdAt: new Date().toISOString(),
                  }
                ]);
             }
          } else if (event.type === 'error') {
             if (onError) onError(new Error(event.error));
          }
        },
        controller.signal
      );
    } catch (err) {
      if (onError) onError(err as Error);
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
      // Invalidate queries to sync with backend
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversation-usage', conversationId] });
    }
  }, [token, conversationId, onBeforeSend, onError, stop, queryClient]);

  const regenerate = useCallback(async () => {
    if (!token || !conversationId || !conversation) return;

    const messages = optimisticMessages;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role.toLowerCase() !== 'assistant') return;

    const userMsgIndex = messages.length - 2;
    if (userMsgIndex < 0) return;
    const userMsg = messages[userMsgIndex];

    // Optimistically remove last two messages
    setOptimisticMessages((prev) => prev.slice(0, userMsgIndex));

    try {
        // Delete from backend if real IDs
        if (!lastMsg.id.startsWith('assistant-')) {
            await deleteMessage(token, conversationId, lastMsg.id);
        }
        if (!userMsg.id.startsWith('local-')) {
             await deleteMessage(token, conversationId, userMsg.id);
        }

        // Resend
        await sendMessage(userMsg.content, userMsg.images, {
            model: conversation.model || undefined,
            temperature: conversation.temperature || undefined,
            topP: conversation.topP || undefined
        });

    } catch (err) {
        if (onError) onError(err as Error);
        // Revert on error (refetch)
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }

  }, [token, conversationId, conversation, optimisticMessages, sendMessage, onError, queryClient]);

  return {
    conversation,
    usage,
    messages: optimisticMessages,
    streamingText,
    thinkingText,
    isThinking,
    toolStatus,
    isStreaming,
    isLoading: isLoadingConversation,
    sendMessage,
    regenerate,
    stop,
    refetch: refetchConversation
  };
}
