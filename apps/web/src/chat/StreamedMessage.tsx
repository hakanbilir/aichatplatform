import React, { useSyncExternalStore, memo } from 'react';

import { StreamStore } from './StreamStore';
import { MessageBubble } from './MessageBubble';

interface StreamedMessageProps {
  streamStore: StreamStore;
  role: 'assistant' | 'user' | 'tool';
  isThinking?: boolean;
}

// Optimized with React.memo to prevent unnecessary re-renders when parent updates.
// StreamedMessage uses useSyncExternalStore to manage high-frequency streaming updates internally,
// so we don't need it to re-render when ChatView or other parents re-render.
const StreamedMessageComponent: React.FC<StreamedMessageProps> = ({
  streamStore,
  role,
  isThinking,
}) => {
  const { content, thinking } = useSyncExternalStore(
    streamStore.subscribe,
    streamStore.getSnapshot,
  );

  return (
    <MessageBubble
      role={role}
      content={content}
      thinkingText={thinking}
      isThinking={isThinking}
      isStreaming={true}
    />
  );
};

export const StreamedMessage = memo(StreamedMessageComponent);
