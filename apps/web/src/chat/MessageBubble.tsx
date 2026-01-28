import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      sx={{
        '&:hover .message-actions': {
          opacity: 1
        }
      }}
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
          position: 'relative',
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>

        <Box
            className="message-actions"
            sx={{
                position: 'absolute',
                bottom: -28,
                right: isUser ? 0 : 'auto',
                left: isUser ? 'auto' : 0,
                opacity: 0,
                transition: 'opacity 0.2s',
                display: 'flex',
                gap: 0.5,
                zIndex: 1,
            }}
        >
            <Tooltip title={copied ? "Copied" : "Copy"}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{ color: 'text.secondary', bgcolor: 'rgba(0,0,0,0.2)' }}
                >
                    {copied ? <CheckIcon fontSize="small" sx={{ fontSize: 16 }} /> : <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />}
                </IconButton>
            </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
