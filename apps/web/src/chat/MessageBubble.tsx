import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { useTranslation } from 'react-i18next';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PsychologyIcon from '@mui/icons-material/Psychology';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

// Optimized with React.memo to prevent re-renders of list items during streaming
const MessageBubbleComponent: React.FC<MessageBubbleProps> = ({ role, content, images }) => {
  const { t } = useTranslation('chat');
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple parsing for <think> blocks
  const renderContent = () => {
    // If no thinking tags, just return content
    if (!content.includes('<think>')) {
      return (
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      );
    }

    const parts = content.split(/(<think>[\s\S]*?<\/think>)/g);
    return parts.map((part, index) => {
      if (part.startsWith('<think>') && part.endsWith('</think>')) {
        const thoughtContent = part.slice(7, -8).trim(); // Remove tags
        return (
          <Accordion
            key={index}
            disableGutters
            sx={{
              bgcolor: 'rgba(0,0,0,0.2)',
              color: 'text.secondary',
              boxShadow: 'none',
              mb: 1,
              borderRadius: 1,
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
              aria-label={t('message.reasoning', 'Reasoning Process')}
              sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { margin: '8px 0' } }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <PsychologyIcon fontSize="small" />
                <Typography variant="caption">Reasoning Process</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0, pb: 1 }}>
              <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                {thoughtContent}
              </Typography>
            </AccordionDetails>
          </Accordion>
        );
      }
      if (!part.trim()) return null;
      return (
        <Typography key={index} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {part}
        </Typography>
      );
    });
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
        {/* Images */}
        {images && images.length > 0 && (
          <Box display="flex" gap={1} mb={1} flexWrap="wrap">
            {images.map((img, idx) => (
              <Box key={idx} sx={{ borderRadius: 2, overflow: 'hidden', maxWidth: '100%' }}>
                <img src={img} alt="attachment" style={{ maxWidth: '100%', maxHeight: 300, display: 'block' }} />
              </Box>
            ))}
          </Box>
        )}

        {renderContent()}

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
            <Tooltip title={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}>
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  aria-label={copied ? t('message.copied', 'Copied') : t('message.copy', 'Copy')}
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
