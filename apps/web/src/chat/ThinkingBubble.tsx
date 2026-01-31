import React, { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, Psychology } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface ThinkingBubbleProps {
  text: string;
  isThinking: boolean;
}

export function ThinkingBubble({ text, isThinking }: ThinkingBubbleProps) {
  const { t } = useTranslation('chat');
  const [expanded, setExpanded] = useState(false);

  if (!text && !isThinking) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded(!expanded);
    }
  };

  return (
    <Box sx={{
      mb: 1,
      border: '1px solid',
      borderColor: 'divider',
      borderRadius: 2,
      overflow: 'hidden',
      maxWidth: '100%',
      alignSelf: 'flex-start'
    }}>
      <Box
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-controls="thought-content"
        aria-label={t('thinking.toggle', 'Toggle thought process')}
        onClick={() => setExpanded(!expanded)}
        onKeyDown={handleKeyDown}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          p: 1,
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' },
          '&:focus-visible': {
            outline: '2px solid',
            outlineColor: 'primary.main',
            outlineOffset: '-2px'
          },
          transition: 'background-color 0.2s'
        }}
      >
        <Psychology
          sx={{
            fontSize: 18,
            mr: 1,
            color: isThinking ? 'info.main' : 'text.secondary',
            animation: isThinking ? 'pulse 1.5s infinite ease-in-out' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 0.6 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.6 },
            }
          }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1, fontWeight: 500 }}>
          {isThinking ? t('thinking.thinking', 'Thinking...') : t('thinking.process', 'Thought process')}
        </Typography>
        {expanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
      </Box>
      <Collapse in={expanded}>
        <Box
          id="thought-content"
          sx={{ p: 1.5, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
            {text}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
