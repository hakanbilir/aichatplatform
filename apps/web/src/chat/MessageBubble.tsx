import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const { t } = useTranslation('chat');
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      sx={{ '&:hover .message-actions': { opacity: 1 } }}
    >
      <Box
        sx={{
          maxWidth: '80%',
          px: 1.8,
          py: 1.2,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'rgba(15,17,35,0.9)',
          color: 'white',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : '0 10px 24px rgba(0,0,0,0.65)',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      </Box>

      {!isUser && (
        <Box
          className="message-actions"
          sx={{
            opacity: 0,
            transition: 'opacity 0.2s',
            ml: 1,
            alignSelf: 'center',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Tooltip title={copied ? t('message.copied') : t('message.copy')}>
            <IconButton
              onClick={handleCopy}
              size="small"
              sx={{
                color: 'rgba(255,255,255,0.5)',
                '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
              }}
              aria-label={t('message.copy')}
            >
              {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
