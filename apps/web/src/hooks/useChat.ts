import { useState, useRef, useCallback, useEffect } from 'react';
import { ConversationDetails, getConversation, getConversationUsage, ConversationUsageSummary } from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';
import { useAuth } from '../auth/AuthContext';

export interface UseChatOptions {
  onConversationUpdated?: (conversation: ConversationDetails) => void;
  onUsageUpdated?: (usage: ConversationUsageSummary) => void;
}

export interface UseChatReturn {
  conversation: ConversationDetails | null;
  streamingText: string;
  isStreaming: boolean;
  sendMessage: (content: string, options?: { model?: string; temperature?: number; topP?: number }) => Promise<void>;
  stopGeneration: () => void;
  loadConversation: (id: string) => Promise<void>;
  resetConversation: () => void;
  setConversation: React.Dispatch<React.SetStateAction<ConversationDetails | null>>;
}

export function useChat(options?: UseChatOptions): UseChatReturn {
  const { token } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Keep options in a ref to avoid dependency cycles / infinite loops
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const resetConversation = useCallback(() => {
    setConversation(null);
    setStreamingText('');
    setIsStreaming(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    if (!token) return;
    try {
      const [convResp, usageResp] = await Promise.all([
        getConversation(token, id),
        getConversationUsage(token, id).catch(() => null),
      ]);
      setConversation(convResp.conversation);
      if (optionsRef.current?.onConversationUpdated) {
        optionsRef.current.onConversationUpdated(convResp.conversation);
      }
      if (usageResp && optionsRef.current?.onUsageUpdated) {
        optionsRef.current.onUsageUpdated(usageResp);
      }
    } catch (err) {
      console.error('Failed to load conversation', err);
      // Optional: handle error state
    }
  }, [token]); // Removed options from dependency

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (content: string, sendOptions: { model?: string; temperature?: number; topP?: number } = {}) => {
    if (!token || !conversation) return;

    // Abort previous if any
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const localConversationId = conversation.id;

    // Optimistically append user message
    const userMessage = {
      id: `local-${Date.now()}`,
      role: 'USER',
      content,
    };

    setConversation((prev) =>
      prev
        ? {
            ...prev,
            messages: [...prev.messages, { ...userMessage, createdAt: new Date().toISOString() }],
          }
        : prev,
    );

    setStreamingText('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        token,
        localConversationId,
        {
          content,
          model: sendOptions.model,
          temperature: sendOptions.temperature,
          topP: sendOptions.topP,
        },
        (event: StreamEvent) => {
          if (event.type === 'token') {
            setStreamingText((prev) => prev + event.token);
          }

          if (event.type === 'end' && event.message) {
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
                      },
                    ],
                  }
                : prev,
            );
          }
        },
        controller.signal,
      );
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    // Refresh from backend to align IDs and usage
    if (token && localConversationId) {
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, localConversationId),
          getConversationUsage(token, localConversationId).catch(() => null),
        ]);
        setConversation(convResp.conversation);
        if (optionsRef.current?.onConversationUpdated) {
          optionsRef.current.onConversationUpdated(convResp.conversation);
        }
        if (usageResp && optionsRef.current?.onUsageUpdated) {
          optionsRef.current.onUsageUpdated(usageResp);
        }
      } catch {
        // ignore
      }
    }
  }, [token, conversation]); // Removed options from dependency

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  return {
    conversation,
    streamingText,
    isStreaming,
    sendMessage,
    stopGeneration,
    loadConversation,
    resetConversation,
    setConversation,
  };
}
