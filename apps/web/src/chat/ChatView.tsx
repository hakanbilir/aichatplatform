import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MessageBubble } from './MessageBubble';
import { ChatMessage } from '../hooks/useChat';

interface ChatViewProps {
  messages: ChatMessage[];
}

export const ChatView: React.FC<ChatViewProps> = ({ messages }) => {
  const { t } = useTranslation('chat');

  if (messages.length === 0) {
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
            role={m.role === 'user' ? 'user' : 'assistant'}
            content={m.content}
            images={m.images}
        />
      ))}
    </Box>
  );
};
