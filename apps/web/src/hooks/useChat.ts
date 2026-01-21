import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  ConversationDetails,
  getConversation,
  getConversationUsage,
  ConversationUsageSummary,
  updateConversation,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

export function useChat(conversationId: string | null) {
  const { token } = useAuth();
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load conversation when ID changes
  useEffect(() => {
    if (!token || !conversationId) {
      setConversation(null);
      setUsage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      if (!token || !conversationId) return;
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, conversationId),
          getConversationUsage(token, conversationId).catch(() => null),
        ]);
        if (!cancelled) {
          setConversation(convResp.conversation);
          if (usageResp) setUsage(usageResp);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  const sendMessage = useCallback(async (content: string, options?: { model?: string; temperature?: number; topP?: number }) => {
    if (!token || !conversationId || !conversation) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    // Optimistic update
    const userMessage = {
      id: `local-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
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

    // Use options or fallbacks from conversation
    const model = options?.model ?? conversation.model ?? 'llama3.1';
    const temperature = options?.temperature ?? conversation.temperature ?? 0.7;
    const topP = options?.topP ?? conversation.topP ?? 1;

    try {
      await streamMessage(
        token,
        conversationId,
        {
          content,
          model,
          temperature,
          topP,
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
             // Optionally set error state here, but streaming errors might be partial
          }
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }

    // Sync with backend to get real IDs and updated usage
    try {
       const [convResp, usageResp] = await Promise.all([
          getConversation(token, conversationId),
          getConversationUsage(token, conversationId).catch(() => null),
        ]);
        setConversation(convResp.conversation);
        if (usageResp) setUsage(usageResp);
    } catch {
      // ignore
    }

  }, [token, conversationId, conversation]);

  const updateSettings = useCallback(async (settings: { model?: string; temperature?: number; topP?: number }) => {
    if (!token || !conversationId) return;
    try {
      const resp = await updateConversation(token, conversationId, settings);
      setConversation((prev) => prev ? { ...prev, ...settings } : prev);
      return resp;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, [token, conversationId]);

  const abort = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, []);

  return {
    conversation,
    loading,
    error,
    streaming,
    streamingText,
    usage,
    sendMessage,
    updateSettings,
    setConversation,
    abort
  };
}
