import React, { useSyncExternalStore } from 'react';
import { StreamStore } from './StreamStore';
import { MessageBubble } from './MessageBubble';

interface StreamedMessageProps {
  streamStore: StreamStore;
  role: 'assistant' | 'user' | 'tool';
  isThinking?: boolean;
}

export const StreamedMessage: React.FC<StreamedMessageProps> = ({ streamStore, role, isThinking }) => {
  const { content, thinking } = useSyncExternalStore(
    streamStore.subscribe,
    streamStore.getSnapshot
  );

  return (
    <MessageBubble
      role={role}
      content={content}
      thinkingText={thinking}
      isThinking={isThinking}
    />
  );
};
