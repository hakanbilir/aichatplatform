import { useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../api/client';

export function useConversationStream() {
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    let active = true;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    const connect = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/conversations/stream`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.body) return;
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
               const jsonStr = line.substring(6);
               try {
                 const event = JSON.parse(jsonStr);

                 if (event.type === 'conversation.created') {
                    // Dispatch window event to refresh lists (SideNav, Dashboard)
                    // This makes the static lists "Kinetic" by updating in real-time
                    window.dispatchEvent(new CustomEvent('conversation-created', {
                        detail: event.context?.conversationId
                    }));
                 }

                 // Future: handle conversation.updated, message.created, etc.
               } catch (e) {
                 // ignore parse errors or heartbeats
               }
            }
          }
        }
      } catch (err) {
        console.error('Conversation stream error', err);
        // Simple retry logic
        if (active) {
            setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      active = false;
      if (reader) reader.cancel();
    };
  }, [token]);
}
