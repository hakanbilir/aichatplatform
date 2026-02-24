import React from 'react';
import { Box, Typography } from '@mui/material';

import { DashboardBentoGrid } from '../components/dashboard/DashboardBentoGrid';

import { MessageBubble } from './MessageBubble';
import { StreamStore } from './StreamStore';
import { StreamedMessage } from './StreamedMessage';

interface ChatViewProps {
  messages: Array<{ id: string; role: string; content: string; images?: string[]; meta?: unknown; thinkingText?: string; isThinking?: boolean }>;
  streamingAssistantText: string;
  toolStatus?: string | null;
  thinkingText?: string;
  isThinking?: boolean;
  streamStore?: StreamStore;
  isStreaming?: boolean;
}

// Optimized component to prevent re-rendering the entire list during streaming
const MessageList = React.memo(function MessageList({ messages }: { messages: ChatViewProps['messages'] }) {
  return (
    <>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          role={m.role === 'USER' || m.role === 'user' ? 'user' : (m.role === 'TOOL' || m.role === 'tool' ? 'tool' : 'assistant')}
          content={m.content}
          images={m.images}
          meta={m.meta}
          thinkingText={m.thinkingText}
          isThinking={m.isThinking}
        />
      ))}
    </>
  );
});

const ChatViewComponent: React.FC<ChatViewProps> = ({
  messages,
  streamingAssistantText,
  toolStatus,
  thinkingText,
  isThinking,
  streamStore,
  isStreaming
}) => {
  const hasStreaming = isStreaming || isThinking || !!streamingAssistantText;
  const isEmpty = messages.length === 0 && !hasStreaming;

  if (isEmpty) {
    return <DashboardBentoGrid />;
  }

  return (
    <Box flex={1} overflow="auto" px={3} py={2}>
      <MessageList messages={messages} />
      {hasStreaming && (
        streamStore ? (
          <StreamedMessage
            key="streaming"
            // eslint-disable-next-line jsx-a11y/aria-role
            role="assistant"
            streamStore={streamStore}
            isThinking={isThinking}
          />
        ) : (
          <MessageBubble
            key="streaming"
            // eslint-disable-next-line jsx-a11y/aria-role
            role="assistant"
            content={streamingAssistantText}
            thinkingText={thinkingText}
            isThinking={isThinking}
          />
        )
      )}
      {toolStatus && (
        <Box display="flex" justifyContent="flex-start" mb={2} pl={2}>
           <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
             {toolStatus}
           </Typography>
        </Box>
      )}
    </Box>
  );
};

export const ChatView = React.memo(ChatViewComponent);
