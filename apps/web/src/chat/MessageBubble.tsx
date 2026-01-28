import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip, Fade } from '@mui/material';
import { ContentCopy, Check } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const { t } = useTranslation('common');
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{ position: 'relative' }}
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
          paddingRight: !isUser ? 4 : 1.8, // Make space for copy button on assistant messages
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>

        {!isUser && (
          <Fade in={isHovered || copied}>
            <Box
              sx={{
                position: 'absolute',
                right: 4,
                top: 4,
                bgcolor: 'rgba(0,0,0,0.3)',
                borderRadius: '50%',
              }}
            >
              <Tooltip title={copied ? t('copied') : t('copy')} placement="top">
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  aria-label={t('copy')}
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    padding: 0.5,
                    '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  {copied ? <Check fontSize="small" sx={{ fontSize: 16 }} /> : <ContentCopy fontSize="small" sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Fade>
        )}
      </Box>
    </Box>
  );
};

export const MessageBubble = React.memo(MessageBubbleComponent);
