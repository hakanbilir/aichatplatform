import { useState, useCallback, useRef } from 'react';
import { streamMessage, StreamEvent, Attachment } from '../api/chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
  attachments?: Attachment[];
}

interface UseChatOptions {
  token: string | null;
  conversationId: string | null;
  initialMessages?: Message[];
  model?: string;
  temperature?: number;
  topP?: number;
  onFinish?: (message: Message) => void;
  onError?: (error: Error) => void;
}

export function useChat({
  token,
  conversationId,
  initialMessages = [],
  model = 'llama3.1',
  temperature = 0.7,
  topP = 1,
  onFinish,
  onError,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const append = useCallback(
    async (message: Message) => {
      if (!token || !conversationId) return;

      // Optimistic update
      setMessages((prev) => [...prev, message]);
      setIsLoading(true);

      abortControllerRef.current = new AbortController();

      try {
        let assistantContent = '';
        let assistantMessageId = `assistant-${Date.now()}`;

        await streamMessage(
          token,
          conversationId,
          {
            content: message.content,
            model,
            temperature,
            topP,
            attachments: message.attachments,
          },
          (event: StreamEvent) => {
            if (event.type === 'token') {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last.id === assistantMessageId) {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, content: last.content + event.token },
                  ];
                } else {
                  return [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: 'assistant',
                      content: event.token,
                      createdAt: new Date().toISOString(),
                    },
                  ];
                }
              });
              assistantContent += event.token;
            }

            if (event.type === 'end' && event.message) {
              const finalMsg: Message = {
                id: assistantMessageId,
                role: 'assistant',
                content: event.message.content,
                createdAt: new Date().toISOString(),
              };
              setMessages((prev) => {
                 // Replace with final message from server if needed, but streaming usually builds it up.
                 // We ensure the final content matches.
                 const last = prev[prev.length - 1];
                 if (last.id === assistantMessageId) {
                     return [...prev.slice(0, -1), finalMsg];
                 }
                 return [...prev, finalMsg];
              });
              onFinish?.(finalMsg);
            }

            if (event.type === 'error') {
               throw new Error(event.error);
            }
          },
          abortControllerRef.current.signal
        );
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [token, conversationId, model, temperature, topP, onFinish, onError],
  );

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | string) => {
    if (typeof e === 'string') {
      setInput(e);
    } else {
      setInput(e.target.value);
    }
  }, []);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        // Extract base64 part
        const base64 = dataUrl.split(',')[1];

        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type,
            data: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const removeAttachment = useCallback((index: number) => {
      setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if ((!input.trim() && attachments.length === 0) || isLoading) return;

      const userMessage: Message = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: input,
        createdAt: new Date().toISOString(),
        attachments: [...attachments],
      };

      setInput('');
      setAttachments([]);
      await append(userMessage);
    },
    [input, attachments, isLoading, append],
  );

  const setMessagesHelper = useCallback((messages: Message[]) => {
      setMessages(messages);
  }, []);

  return {
    messages,
    setMessages: setMessagesHelper,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    stop,
    attachments,
    handleFileSelect,
    removeAttachment,
  };
}
