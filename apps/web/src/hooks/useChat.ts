import { useState, useCallback, useRef, useEffect } from 'react';
import { ConversationDetails, getConversation, getConversationUsage, ConversationUsageSummary, updateConversation } from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

export interface UseChatOptions {
  conversationId: string | null;
  token: string | null;
  initialConversation?: ConversationDetails | null;
  onConversationUpdated?: (conversation: ConversationDetails) => void;
}

export interface ChatMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  meta?: any;
}

export function useChat({ conversationId, token, initialConversation, onConversationUpdated }: UseChatOptions) {
  const [conversation, setConversation] = useState<ConversationDetails | null>(initialConversation ?? null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState<ConversationUsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Settings
  const [model, setModel] = useState<string>('llama3.1');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [topP, setTopP] = useState<number>(1);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation details
  useEffect(() => {
    if (!token || !conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const [convResp, usageResp] = await Promise.all([
          getConversation(token, conversationId),
          getConversationUsage(token, conversationId).catch(() => null),
        ]);

        if (cancelled) return;

        setConversation(convResp.conversation);
        setMessages(convResp.conversation.messages);

        // Update settings from conversation
        setModel(convResp.conversation.model || 'llama3.1');
        setTemperature(convResp.conversation.temperature ?? 0.7);
        setTopP(convResp.conversation.topP ?? 1);

        if (usageResp) {
          setUsage(usageResp);
        }
      } catch (err) {
        if (!cancelled) setError('Failed to load conversation');
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [token, conversationId]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if (!token || !conversationId || !conversation) return;

    // Stop any existing generation
    stop();

    // Optimistic update
    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
      meta: images && images.length ? { images } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setStreamingText('');
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamMessage(
        token,
        conversationId,
        {
          content,
          images, // Pass images to API
          model,
          temperature,
          topP,
        },
        (event: StreamEvent) => {
          if (event.type === 'token') {
            setStreamingText(prev => prev + event.token);
          }
          else if (event.type === 'tool_call') {
            // For now, just append a temporary system message or handle in UI
            // In a real app, we might want to show a specialized tool UI
            setStreamingText(prev => prev + `\n[Tool Call: ${event.toolCall.toolName}]\n`);
          }
          else if (event.type === 'tool_result') {
             // Optionally show result
             // setStreamingText(prev => prev + `\n[Tool Result]\n`);
          }
          else if (event.type === 'end' && event.message) {
            setStreamingText('');
            const assistantMsg: ChatMessage = {
              id: `assistant-${Date.now()}`,
              role: 'ASSISTANT',
              content: event.message.content,
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, assistantMsg]);

            // Update usage if provided
            if (event.usage) {
               // We might want to fetch full usage, but simple update here could work
               // For now relying on refresh below
            }
          }
          else if (event.type === 'error') {
            setError(event.error);
          }
        },
        controller.signal
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
         // Ignore abort
      } else {
        setError('Failed to send message');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }

    // Refresh conversation state in background
    if (!controller.signal.aborted) {
        try {
            const [convResp, usageResp] = await Promise.all([
                getConversation(token, conversationId),
                getConversationUsage(token, conversationId).catch(() => null),
            ]);
            setConversation(convResp.conversation);
            setMessages(convResp.conversation.messages);
            if (usageResp) setUsage(usageResp);
        } catch {
            // ignore background refresh error
        }
    }
  }, [token, conversationId, conversation, model, temperature, topP, stop]);

  const updateSettings = useCallback(async (newSettings: { model?: string, temperature?: number, topP?: number }) => {
     if (!token || !conversationId) return;

     if (newSettings.model) setModel(newSettings.model);
     if (newSettings.temperature !== undefined) setTemperature(newSettings.temperature);
     if (newSettings.topP !== undefined) setTopP(newSettings.topP);

     try {
         await updateConversation(token, conversationId, newSettings);
     } catch (err) {
         setError('Failed to update settings');
     }
  }, [token, conversationId]);

  return {
    conversation,
    messages,
    isLoading,
    streamingText,
    usage,
    error,
    model,
    temperature,
    topP,
    sendMessage,
    stop,
    updateSettings,
    setModel,
    setTemperature,
    setTopP
  };
}
