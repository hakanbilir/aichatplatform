import { useRef, useEffect, useCallback, useReducer, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  getConversation,
  getConversationUsage,
  deleteMessage,
  ConversationDetails,
  ConversationUsageSummary,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';
import { createStreamStore, StreamStore } from '../chat/StreamStore';

import { chatReducer, initialChatState, ChatStatus } from './chatReducer';

export interface UseChatOptions {
  conversationId: string | null;
  onBeforeSend?: () => void;
  onError?: (error: Error) => void;
  retryCount?: number;
}

export interface UseChatReturn {
  conversation: ConversationDetails | null;
  usage: ConversationUsageSummary | null;
  messages: ConversationDetails['messages'];
  // streamingText & thinkingText are retained for type compatibility but will be empty
  // Use streamStore to subscribe to live updates
  streamingText: string;
  thinkingText: string;
  streamStore: StreamStore;
  isThinking: boolean;
  toolStatus: string | null;
  status: ChatStatus;
  isStreaming: boolean;
  isLoading: boolean;
  error: Error | null;
  sendMessage: (
    content: string,
    images?: string[],
    options?: { model?: string; temperature?: number; topP?: number },
  ) => Promise<void>;
  regenerate: () => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  stop: () => void;
  refetch: () => void;
}

export function useChat({
  conversationId,
  onBeforeSend,
  onError,
  retryCount = 3,
}: UseChatOptions): UseChatReturn {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const abortRef = useRef<AbortController | null>(null);

  // High-frequency stream store
  const streamStore = useMemo(() => createStreamStore(), []);
  const contentRef = useRef('');
  const thinkingRef = useRef('');

  // Queries
  const {
    data: conversationData,
    isLoading: isLoadingConversation,
    refetch: refetchConversation,
  } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => (token && conversationId ? getConversation(token, conversationId) : null),
    enabled: !!token && !!conversationId,
    staleTime: 1000 * 60, // 1 minute
  });

  const { data: usageData } = useQuery({
    queryKey: ['conversation-usage', conversationId],
    queryFn: () => (token && conversationId ? getConversationUsage(token, conversationId) : null),
    enabled: !!token && !!conversationId,
  });

  const conversation = conversationData?.conversation || null;
  const usage = usageData || null;

  // Sync optimistic messages with server data
  useEffect(() => {
    if (conversation?.messages) {
      dispatch({ type: 'SET_MESSAGES', messages: conversation.messages });
    }
  }, [conversation]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    // Don't dispatch RESET_STREAM here to avoid race conditions.
    // The abort will trigger the catch block in sendMessage, which will save the partial message and reset status.
  }, []);

  const sendMessage = useCallback(
    async (
      content: string,
      images?: string[],
      options?: { model?: string; temperature?: number; topP?: number },
    ) => {
      if (!token || !conversationId) return;

      if (onBeforeSend) onBeforeSend();
      // Stop any pending stream but don't reset fully if we are appending?
      // Actually stop() calls RESET_STREAM which clears streamingText.
      // We want to clear streamingText for the *new* message.
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      const userMessageId = `local-${Date.now()}`;
      const userMessage = {
        id: userMessageId,
        role: 'USER',
        content,
        images,
        createdAt: new Date().toISOString(),
      };

      dispatch({ type: 'START_STREAM', userMessage });

      // Reset local stream state
      contentRef.current = '';
      thinkingRef.current = '';
      streamStore.reset();

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
          (event: StreamEvent) => {
            if (event.type === 'token') {
              contentRef.current += event.token;
              streamStore.update(contentRef.current, thinkingRef.current);
              dispatch({ type: 'TOKEN', token: event.token }); // Still dispatch to update status if needed
            } else if (event.type === 'thought_start') {
              thinkingRef.current = '';
              streamStore.update(contentRef.current, thinkingRef.current);
              dispatch({ type: 'THOUGHT_START' });
            } else if (event.type === 'thought_token') {
              thinkingRef.current += event.token;
              streamStore.update(contentRef.current, thinkingRef.current);
              dispatch({ type: 'THOUGHT_TOKEN', token: event.token });
            } else if (event.type === 'thought_end') {
              dispatch({ type: 'THOUGHT_END' });
            } else if (event.type === 'tool_start') {
              dispatch({ type: 'TOOL_START', toolName: event.toolName });
            } else if (event.type === 'tool_end') {
              dispatch({ type: 'TOOL_END' });
            } else if (event.type === 'end') {
              dispatch({
                type: 'STREAM_END',
                finalMessage: event.finalMessage
                  ? {
                      id: `assistant-${Date.now()}`,
                      role: 'ASSISTANT',
                      content: event.finalMessage.content,
                      createdAt: new Date().toISOString(),
                    }
                  : undefined,
              });
              // Stream ended, reset store to avoid flashing if component re-mounts?
              // Actually, we want to keep it until the next stream starts OR the component unmounts.
              // But ChatView logic will switch to showing the message in the list.
              // So resetting here is cleaner.
              streamStore.reset();
            } else if (event.type === 'error') {
              dispatch({ type: 'ERROR', error: new Error(event.error) });
              if (onError) onError(new Error(event.error));
            }
          },
          controller.signal,
          retryCount,
        );
      } catch (err) {
        const error = err as Error;

        // If error or abort occurred, save any partial content generated so far
        if (contentRef.current) {
          dispatch({
            type: 'STREAM_END',
            finalMessage: {
              id: `assistant-${Date.now()}`,
              role: 'ASSISTANT',
              content: contentRef.current,
              createdAt: new Date().toISOString(),
            },
          });
        }

        if (error.name !== 'AbortError') {
          dispatch({ type: 'ERROR', error });
          if (onError) onError(error);
        }
      } finally {
        abortRef.current = null;
        streamStore.reset();
        // Invalidate queries to sync with backend
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['conversation-usage', conversationId] });
      }
    },
    [token, conversationId, onBeforeSend, onError, queryClient, retryCount, streamStore],
  );

  const regenerate = useCallback(async () => {
    if (!token || !conversationId || !conversation) return;

    const messages = state.optimisticMessages;
    if (messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role.toLowerCase() !== 'assistant') return;

    const userMsgIndex = messages.length - 2;
    if (userMsgIndex < 0) return;
    const userMsg = messages[userMsgIndex];

    // Optimistically remove last two messages
    dispatch({ type: 'DELETE_MESSAGES_AFTER', index: userMsgIndex });

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
        topP: conversation.topP || undefined,
      });
    } catch (err) {
      if (onError) onError(err as Error);
      // Revert on error (refetch)
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
    }
  }, [
    token,
    conversationId,
    conversation,
    state.optimisticMessages,
    sendMessage,
    onError,
    queryClient,
  ]);

  const editMessage = useCallback(
    async (messageId: string, newContent: string) => {
      if (!token || !conversationId) return;

      // Find message index
      const msgIndex = state.optimisticMessages.findIndex((m) => m.id === messageId);
      if (msgIndex === -1) return;

      const message = state.optimisticMessages[msgIndex];
      if (message.role.toLowerCase() !== 'user') return; // Can only edit user messages for now

      // Identify messages to delete (this one and all subsequent)
      const messagesToDelete = state.optimisticMessages.slice(msgIndex);

      // Optimistic update: keep only messages before this one
      dispatch({ type: 'DELETE_MESSAGES_AFTER', index: msgIndex });

      try {
        // Delete from backend in sequence
        for (const msg of messagesToDelete) {
          if (!msg.id.startsWith('local-') && !msg.id.startsWith('assistant-')) {
            try {
              await deleteMessage(token, conversationId, msg.id);
            } catch (e) {
              console.warn('Failed to delete message', msg.id, e);
              // Continue anyway to try to resend
            }
          }
        }

        // Resend
        await sendMessage(newContent, message.images, {
          model: conversation?.model || undefined,
          temperature: conversation?.temperature || undefined,
          topP: conversation?.topP || undefined,
        });
      } catch (err) {
        if (onError) onError(err as Error);
        queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      }
    },
    [
      token,
      conversationId,
      state.optimisticMessages,
      sendMessage,
      conversation,
      onError,
      queryClient,
    ],
  );

  return {
    conversation,
    usage,
    messages: state.optimisticMessages,
    streamingText: state.streamingText,
    thinkingText: state.thinkingText,
    streamStore,
    isThinking: state.isThinking,
    toolStatus: state.toolStatus,
    status: state.status,
    isStreaming: state.status === 'streaming' || state.status === 'connecting',
    isLoading: isLoadingConversation,
    error: state.error,
    sendMessage,
    regenerate,
    editMessage,
    stop,
    refetch: refetchConversation,
  };
}
