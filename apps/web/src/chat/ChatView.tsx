import React, { useEffect, useRef } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { MessageBubble } from './MessageBubble';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import RefreshIcon from '@mui/icons-material/Refresh';

interface ChatViewProps {
  messages: Array<{ id: string; role: string; content: string; images?: string[] }>;
  streamingAssistantText: string;
  onRegenerate?: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  streamingAssistantText,
  onRegenerate,
  onStop,
  isStreaming
}) => {
  const { t } = useTranslation('chat');
  const allMessages = [...messages];
  const endRef = useRef<HTMLDivElement>(null);

  if (streamingAssistantText) {
    allMessages.push({ id: 'streaming', role: 'assistant', content: streamingAssistantText });
  }

  // Scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length, streamingAssistantText]);

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

  const lastRole = allMessages[allMessages.length - 1]?.role;
  const showRegenerate = !isStreaming && lastRole === 'ASSISTANT' && onRegenerate;

  return (
    <Box flex={1} overflow="auto" px={3} py={2} position="relative">
      {allMessages.map((m) => (
        <MessageBubble
          key={m.id}
          role={m.role === 'USER' || m.role === 'user' ? 'user' : 'assistant'}
          content={m.content}
          images={m.images}
        />
      ))}

      {/* Streaming / Regenerate Controls at the bottom */}
      <Box display="flex" justifyContent="center" mt={2} mb={1}>
        {isStreaming && onStop && (
           <Button
             variant="outlined"
             color="error"
             startIcon={<StopCircleIcon />}
             onClick={onStop}
             size="small"
           >
             {t('chat.stopGenerating') || "Stop Generating"}
           </Button>
        )}

        {showRegenerate && (
          <Button
            variant="text"
            startIcon={<RefreshIcon />}
            onClick={onRegenerate}
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            {t('chat.regenerate') || "Regenerate"}
          </Button>
        )}
      </Box>

      <div ref={endRef} />
    </Box>
  );
};
