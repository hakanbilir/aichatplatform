import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getConversation,
  getConversationUsage,
  ConversationDetails,
  ConversationUsageSummary,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

interface UseChatOptions {
  onLoad?: (conversation: ConversationDetails) => void;
}

export function useChat(conversationId: string | null, options: UseChatOptions = {}) {
  const { token } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadConversation = useCallback(async () => {
    if (!token || !conversationId) {
      if (isMounted.current) {
        setConversation(null);
        setUsage(null);
      }
      return;
    }

    try {
      if (isMounted.current) setError(null);
      const [convResp, usageResp] = await Promise.all([
        getConversation(token, conversationId),
        getConversationUsage(token, conversationId).catch(() => null),
      ]);

      if (isMounted.current) {
        const conv = convResp.conversation;
        setConversation(conv);
        if (usageResp) {
          setUsage(usageResp);
        }

        if (options.onLoad) {
          options.onLoad(conv);
        }
      }
    } catch (err) {
      if (isMounted.current) {
        console.error('Failed to load conversation:', err);
        setError('Failed to load conversation');
        setConversation(null);
      }
    }
  }, [token, conversationId]); // options.onLoad should be stable or ignored in deps to avoid loops

  // Load conversation details when id or auth changes
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  const sendMessage = useCallback(async (
    content: string,
    settings: { model?: string; temperature?: number; topP?: number; maxTokens?: number }
  ) => {
    if (!token || !conversationId) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Optimistically append user message locally
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
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        token,
        conversationId,
        {
          content,
          ...settings,
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

          if (event.type === 'error') {
            console.error('Stream error:', event.error);
            setError(event.error);
          }
        },
        controller.signal,
      );
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('SendMessage error:', err);
        setError(err.message || 'Failed to send message');
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }

    // Refresh from backend to align IDs and usage
    // Don't await this to keep UI responsive
    loadConversation();
  }, [token, conversationId, loadConversation]);

  const stopGeneration = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
    }
  }, []);

  return {
    conversation,
    setConversation,
    streamingText,
    isStreaming,
    usage,
    error,
    sendMessage,
    stopGeneration,
    refreshConversation: loadConversation,
  };
}
