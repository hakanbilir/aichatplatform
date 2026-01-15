import { useState, useRef, useCallback, useEffect } from 'react';
import { ConversationDetails, getConversation, getConversationUsage, ConversationUsageSummary } from '../api/conversations';
import { streamMessage, StreamEvent } from '../api/chat';

interface UseChatOptions {
  token: string | null;
  conversationId: string | null;
  model: string;
  temperature: number;
  topP: number;
  onConversationUpdate?: (conversation: ConversationDetails) => void;
  onUsageUpdate?: (usage: ConversationUsageSummary) => void;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  images?: string[];
  createdAt?: string;
}

export function useChat({
  token,
  conversationId,
  model,
  temperature,
  topP,
  onConversationUpdate,
  onUsageUpdate,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setStreaming(false);
    }
  }, []);

  const sendMessage = useCallback(async (content: string, images: string[] = [], skipAppend = false) => {
    if (!token || !conversationId) return;

    // Clear previous errors
    setError(null);

    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const localConversationId = conversationId;

    // Only append if not skipped (used for regenerate)
    if (!skipAppend) {
      const userMessage: Message = {
        id: `local-${Date.now()}`,
        role: 'USER',
        content,
        images,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
    }

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
          images: images.length > 0 ? images : undefined,
        },
        (event: StreamEvent) => {
          if (event.type === 'token') {
            setStreamingText((prev) => prev + event.token);
          } else if (event.type === 'end' && event.message) {
             setStreamingText('');
             setMessages((prev) => [
               ...prev,
               {
                 id: `assistant-${Date.now()}`,
                 role: 'ASSISTANT',
                 content: event.message.content,
                 createdAt: new Date().toISOString(),
               },
             ]);
          } else if (event.type === 'error') {
            setError(event.error);
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

      // Refresh conversation state from backend
      if (token && localConversationId) {
        try {
          const [convResp, usageResp] = await Promise.all([
            getConversation(token, localConversationId),
            getConversationUsage(token, localConversationId).catch(() => null),
          ]);

          if (onConversationUpdate) onConversationUpdate(convResp.conversation);
          if (usageResp && onUsageUpdate) onUsageUpdate(usageResp);

          // Sync messages from backend (optional, but good for IDs)
          // Ensure we don't overwrite if the user has sent another message quickly (though streaming blocks)
          setMessages(convResp.conversation.messages.map((m: any) => ({
             id: m.id,
             role: m.role,
             content: m.content,
             images: m.images,
             createdAt: m.createdAt,
          })));
        } catch {
          // ignore
        }
      }
    }
  }, [token, conversationId, model, temperature, topP, onConversationUpdate, onUsageUpdate]);

  const reload = useCallback(async () => {
    if (messages.length === 0) return;

    // Find last user message
    const lastUserMessageIndex = messages.findLastIndex(m => m.role === 'USER' || m.role === 'user');
    if (lastUserMessageIndex === -1) return;

    const lastUserMessage = messages[lastUserMessageIndex];

    // Remove all messages AFTER the last user message, but KEEP the last user message.
    // We want to regenerate the RESPONSE to this message.
    // So we just clear the history after it.
    // Wait, if we keep it, we shouldn't append it again in sendMessage.
    // So we pass `skipAppend: true`.

    setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));

    // Resend
    await sendMessage(lastUserMessage.content, lastUserMessage.images, true);
  }, [messages, sendMessage]);

  return {
    messages,
    setMessages,
    sendMessage,
    stop,
    reload,
    streaming,
    streamingText,
    error,
  };
}
