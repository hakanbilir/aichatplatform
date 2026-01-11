import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getConversation,
  getConversationUsage,
  ConversationDetails,
  ConversationUsageSummary,
  updateConversation,
  CreateConversationPayload,
  createConversation,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

export interface UseChatOptions {
  onConversationCreated?: (id: string) => void;
}

export function useChat(conversationId: string | null, options?: UseChatOptions) {
  const { token } = useAuth();

  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);

  // Model settings
  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [dirty, setDirty] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Load conversation
  useEffect(() => {
    if (!token || !conversationId) {
      setConversation(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      if (!token || !conversationId) return;
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, conversationId),
          getConversationUsage(token, conversationId).catch(() => null),
        ]);

        if (cancelled) return;

        const conv = convResp.conversation;
        setConversation(conv);

        // Initialize settings from conversation
        setModel(conv.model || 'llama3.1');
        setTemperature(conv.temperature ?? 0.7);
        setTopP(conv.topP ?? 1);
        setDirty(false);
        setStreamingText('');

        if (usageResp) {
          setUsage(usageResp);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load conversation', err);
          setConversation(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  // Auto clear saved state
  useEffect(() => {
    if (!savedAt) return;
    const timer = setTimeout(() => setSavedAt(null), 2000);
    return () => clearTimeout(timer);
  }, [savedAt]);

  const sendMessage = useCallback(async (content: string) => {
    if (!token || !conversationId || !conversation) return;

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const localConversationId = conversationId;

    // Optimistic update
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
        : prev
    );

    setStreamingText('');
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamMessage(
        token,
        localConversationId,
        {
          content,
          model,
          temperature,
          topP,
        },
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
                      },
                    ],
                  }
                : prev
            );
          } else if (event.type === 'error') {
            console.error('Stream error:', event.error);
            // Optionally handle error in UI
          }
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('SendMessage failed', err);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }

    // Refresh data to get correct IDs and usage
    if (token && localConversationId) {
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, localConversationId),
          getConversationUsage(token, localConversationId).catch(() => null),
        ]);
        setConversation(convResp.conversation);
        if (usageResp) setUsage(usageResp);
      } catch {
        // ignore background refresh errors
      }
    }
  }, [token, conversationId, conversation, model, temperature, topP]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    if (!token || !conversationId) return;
    setSavingSettings(true);
    try {
      const resp = await updateConversation(token, conversationId, {
        model,
        temperature,
        topP
      });
      setConversation((prev) => prev ? {
        ...prev,
        model: resp.conversation.model,
        temperature: resp.conversation.temperature,
        topP: resp.conversation.topP
      } : prev);
      setDirty(false);
      setSavedAt(Date.now());
    } finally {
      setSavingSettings(false);
    }
  }, [token, conversationId, model, temperature, topP]);

  const resetSettings = useCallback(() => {
    if (!conversation) return;
    setModel(conversation.model || 'llama3.1');
    setTemperature(conversation.temperature ?? 0.7);
    setTopP(conversation.topP ?? 1);
    setDirty(false);
  }, [conversation]);

  const updateModel = useCallback((val: string) => {
    setModel(val);
    setDirty(true);
  }, []);

  const updateTemperature = useCallback((val: number) => {
    setTemperature(val);
    setDirty(true);
  }, []);

  const updateTopP = useCallback((val: number) => {
    setTopP(val);
    setDirty(true);
  }, []);

  const createNewConversation = useCallback(async (title: string) => {
    if (!token) return;
    try {
      const resp = await createConversation(token, { title });
      if (options?.onConversationCreated) {
        options.onConversationCreated(resp.id);
      }
      return resp.id;
    } catch (err) {
      console.error('Failed to create conversation', err);
      throw err;
    }
  }, [token, options]);

  return {
    conversation,
    loading,
    streaming,
    streamingText,
    usage,
    settings: {
      model,
      temperature,
      topP,
      dirty,
      saving: savingSettings,
      savedAt,
      updateModel,
      updateTemperature,
      updateTopP,
      save: saveSettings,
      reset: resetSettings
    },
    sendMessage,
    stop,
    createNewConversation
  };
}
