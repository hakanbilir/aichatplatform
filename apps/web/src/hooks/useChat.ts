import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  ConversationDetails,
  getConversation,
  createConversation,
  updateConversation,
  getConversationUsage,
  ConversationUsageSummary,
} from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

function clampTemperature(value: number): number {
  if (Number.isNaN(value)) return 0.7;
  if (value < 0) return 0;
  if (value > 2) return 2;
  return value;
}

function clampTopP(value: number): number {
  if (Number.isNaN(value)) return 1;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function useChat() {
  const { t } = useTranslation('chat');
  const { token } = useAuth();

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationDetails | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);

  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);
  const [dirty, setDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Listen for conversation selection/creation events from sidebar
  useEffect(() => {
    const handleSelect = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
    };

    const handleCreated = async (_e: Event) => {
      if (!token) return;
      try {
        const resp = await createConversation(token, { title: t('conversation.new') });
        const event = new CustomEvent('conversation-created', { detail: resp.id });
        window.dispatchEvent(event);
        setConversationId(resp.id);
      } catch {
        // ignore
      }
    };

    const handleExport = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
    };

    const handleShare = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setConversationId(id);
    };

    window.addEventListener('select-conversation', handleSelect);
    window.addEventListener('create-conversation', handleCreated);
    window.addEventListener('conversation-export', handleExport);
    window.addEventListener('conversation-share', handleShare);

    return () => {
      window.removeEventListener('select-conversation', handleSelect);
      window.removeEventListener('create-conversation', handleCreated);
      window.removeEventListener('conversation-export', handleExport);
      window.removeEventListener('conversation-share', handleShare);
    };
  }, [token, t]);

  // Load conversation details when id or auth changes
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
          const conv = convResp.conversation;
          setConversation(conv);
          const nextModel = conv.model || 'llama3.1';
          const nextTemp = clampTemperature(conv.temperature ?? 0.7);
          const nextTopP = clampTopP(conv.topP ?? 1);
          setModel(nextModel);
          setTemperature(nextTemp);
          setTopP(nextTopP);
          setStreamingText('');
          setDirty(false);
          if (usageResp) {
            setUsage(usageResp);
          }
        }
      } catch {
        if (!cancelled) setConversation(null);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  // Auto-clear the "Saved" chip after some time
  useEffect(() => {
    if (!savedAt) return;
    const timeout = window.setTimeout(() => {
      setSavedAt(null);
    }, 2000);
    return () => window.clearTimeout(timeout);
  }, [savedAt]);

  const sendMessage = useCallback(async (content: string) => {
    if (!token || !conversationId) return;

    if (!conversation) {
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const localConversationId = conversationId;

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
      setStreaming(false);
    }

    // Refresh from backend to align IDs and usage
    if (token && localConversationId) {
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, localConversationId),
          getConversationUsage(token, localConversationId).catch(() => null),
        ]);
        setConversation(convResp.conversation);
        if (usageResp) {
          setUsage(usageResp);
        }
      } catch {
        // ignore
      }
    }
  }, [token, conversationId, conversation, model, temperature, topP]);

  const saveSettings = useCallback(async () => {
    if (!token || !conversationId) return;

    setSaving(true);
    try {
      const resp = await updateConversation(token, conversationId, {
        model,
        temperature,
        topP,
      });
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              model: resp.conversation.model,
              temperature: resp.conversation.temperature,
              topP: resp.conversation.topP,
            }
          : prev,
      );
      setDirty(false);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }, [token, conversationId, model, temperature, topP]);

  const resetSettings = useCallback(() => {
    if (!conversation) return;
    const baseModel = conversation.model || 'llama3.1';
    const baseTemp = clampTemperature(conversation.temperature ?? 0.7);
    const baseTopP = clampTopP(conversation.topP ?? 1);
    setModel(baseModel);
    setTemperature(baseTemp);
    setTopP(baseTopP);
    setDirty(false);
  }, [conversation]);

  return {
    conversationId,
    setConversationId,
    conversation,
    setConversation,
    streamingText,
    streaming,
    model,
    setModel: (val: string) => { setModel(val); setDirty(true); },
    temperature,
    setTemperature: (val: number) => { setTemperature(val); setDirty(true); },
    topP,
    setTopP: (val: number) => { setTopP(val); setDirty(true); },
    dirty,
    saving,
    savedAt,
    usage,
    sendMessage,
    saveSettings,
    resetSettings
  };
}
