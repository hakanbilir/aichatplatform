import React, { useState, useEffect } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, Psychology } from '@mui/icons-material';

interface ThinkingBubbleProps {
  text: string;
  isThinking: boolean;
}

export function ThinkingBubble({ text, isThinking }: ThinkingBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand if thinking for the first time? Maybe not, keep it subtle.
  // But if it's the only thing visible, maybe show it?

  if (!text && !isThinking) return null;

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
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          p: 1,
          bgcolor: 'action.hover',
          '&:hover': { bgcolor: 'action.selected' },
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
          {isThinking ? 'Thinking...' : 'Thought process'}
        </Typography>
        {expanded ? <ExpandLess fontSize="small" color="action" /> : <ExpandMore fontSize="small" color="action" />}
      </Box>
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }}>
            {text}
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
}
