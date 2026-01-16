import React, { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MessageBubble } from './MessageBubble';

interface ChatViewProps {
  messages: Array<{ id: string; role: string; content: string }>;
  streamingAssistantText: string;
}

export const ChatView: React.FC<ChatViewProps> = ({ messages, streamingAssistantText }) => {
  const { t } = useTranslation('chat');
  const bottomRef = useRef<HTMLDivElement>(null);
  const allMessages = [...messages];

  if (streamingAssistantText) {
    allMessages.push({ id: 'streaming', role: 'assistant', content: streamingAssistantText });
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingAssistantText]);

  if (allMessages.length === 0) {
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
      {allMessages.map((m) => (
        <MessageBubble
          key={m.id}
          role={m.role === 'USER' || m.role === 'user' ? 'user' : 'assistant'}
          content={m.content}
        />
      ))}
      <div ref={bottomRef} />
    </Box>
  );
};

