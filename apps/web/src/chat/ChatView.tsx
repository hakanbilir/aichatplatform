import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Array<{ id: string; role: string; content: string; images?: string[]; meta?: any }>;
  streamingAssistantText: string;
  toolStatus?: string | null;
  thinkingText?: string;
  isThinking?: boolean;
}

const ChatViewComponent: React.FC<ChatViewProps> = ({ messages, streamingAssistantText, toolStatus, thinkingText, isThinking }) => {
  const { t } = useTranslation('chat');

  const hasStreaming = !!(streamingAssistantText || isThinking);
  const isEmpty = messages.length === 0 && !hasStreaming;

  if (isEmpty) {
    return (
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        sx={{ opacity: 0.8 }}
      >
        <Typography variant="h6" gutterBottom>
          {t('empty.startConversation')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('empty.description')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box flex={1} overflow="auto" px={3} py={2}>
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          role={m.role === 'USER' || m.role === 'user' ? 'user' : (m.role === 'TOOL' || m.role === 'tool' ? 'tool' : 'assistant')}
          content={m.content}
          images={m.images}
          meta={m.meta}
          thinkingText={(m as any).thinkingText}
          isThinking={(m as any).isThinking}
        />
      ))}
      {hasStreaming && (
        <MessageBubble
          key="streaming"
          role="assistant"
          content={streamingAssistantText}
          thinkingText={thinkingText}
          isThinking={isThinking}
        />
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
