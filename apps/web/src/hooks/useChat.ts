import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversation,
  getConversationUsage,
  ConversationDetails,
  updateConversation,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';

export interface UseChatOptions {
  conversationId: string | null;
}

export interface Attachment {
  type: 'image' | 'file';
  name?: string;
  content: string; // base64
}

export function useChat({ conversationId }: UseChatOptions) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch conversation details
  const { data: conversationData, isLoading: isLoadingConversation, error: conversationError } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => {
      if (!token || !conversationId) return null;
      return getConversation(token, conversationId);
    },
    enabled: !!token && !!conversationId,
    staleTime: 1000 * 60, // 1 minute
  });

  const conversation = conversationData?.conversation || null;

  // Fetch usage
  const { data: usage } = useQuery({
    queryKey: ['conversationUsage', conversationId],
    queryFn: () => {
        if (!token || !conversationId) return null;
        return getConversationUsage(token, conversationId).catch(() => null);
    },
    enabled: !!token && !!conversationId,
  });

  // Optimistic updates helper
  const updateOptimisticConversation = (updater: (prev: ConversationDetails | null) => ConversationDetails | null) => {
    queryClient.setQueryData(['conversation', conversationId], (old: { conversation: ConversationDetails } | undefined) => {
        if (!old) return old;
        const updated = updater(old.conversation);
        return updated ? { conversation: updated } : old;
    });
  };

  const sendMessageMutation = useMutation({
    mutationFn: async (payload: {
      content: string;
      model?: string;
      temperature?: number;
      topP?: number;
      attachments?: Attachment[];
    }) => {
      if (!token || !conversationId) throw new Error('No token or conversationId');

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      setStreamingText('');

      try {
        await streamMessage(
          token,
          conversationId,
          payload,
          (event: StreamEvent) => {
            if (event.type === 'token') {
              setStreamingText((prev) => prev + event.token);
            }
            if (event.type === 'end' && event.message) {
              setStreamingText('');
              // Update conversation with final assistant message
               updateOptimisticConversation((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    messages: [
                        ...prev.messages,
                        {
                            id: `assistant-${Date.now()}`,
                            role: 'ASSISTANT',
                            content: event.message.content,
                            createdAt: new Date().toISOString(),
                        }
                    ]
                };
               });
            }
          },
          controller.signal
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh state (including IDs)
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversationUsage', conversationId] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: { model?: string; temperature?: number; topP?: number }) => {
        if (!token || !conversationId) throw new Error('No token or conversationId');
        return updateConversation(token, conversationId, payload);
    },
    onSuccess: (data) => {
        queryClient.setQueryData(['conversation', conversationId], data);
    }
  });

  const handleSend = async (content: string, attachments: Attachment[] = [], options?: { model?: string, temperature?: number, topP?: number }) => {
     if (!conversation) return;

     // Optimistic user message
     const userMessage = {
        id: `local-${Date.now()}`,
        role: 'USER',
        content,
        meta: attachments.length > 0 ? { attachments } : undefined, // Store locally for optimistic
     };

     updateOptimisticConversation((prev) => prev ? {
        ...prev,
        messages: [...prev.messages, { ...userMessage, createdAt: new Date().toISOString() }]
     } : prev);

     await sendMessageMutation.mutateAsync({
        content,
        attachments,
        ...options
     });
  };

  const stopGeneration = () => {
      if (abortRef.current) {
          abortRef.current.abort();
          setStreaming(false);
      }
  };

  return {
    conversation,
    isLoadingConversation,
    conversationError,
    usage,
    streamingText,
    streaming,
    sendMessage: handleSend,
    stopGeneration,
    updateSettings: updateSettingsMutation.mutateAsync,
    isUpdatingSettings: updateSettingsMutation.isPending,
  };
}
