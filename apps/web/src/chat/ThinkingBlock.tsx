import React, { useState } from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import PsychologyIcon from '@mui/icons-material/Psychology';
import { useTranslation } from 'react-i18next';

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

export const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isStreaming }) => {
  const { t } = useTranslation('chat');
  const [expanded, setExpanded] = useState(true);

  return (
    <Box
      sx={{
        border: '1px solid rgba(124,77,255,0.2)',
        borderRadius: 2,
        bgcolor: 'rgba(124,77,255,0.05)',
        overflow: 'hidden',
        mb: 2,
        mt: 1,
      }}
    >
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          p: 1.5,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': {
            bgcolor: 'rgba(124,77,255,0.08)',
          },
        }}
      >
        <PsychologyIcon
          fontSize="small"
          sx={{
            color: 'primary.light',
            animation: isStreaming ? 'pulse 2s infinite' : 'none',
            '@keyframes pulse': {
              '0%': { opacity: 0.5 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.5 },
            },
          }}
        />
        <Typography variant="caption" color="primary.light" sx={{ flex: 1, fontWeight: 600, letterSpacing: 0.5 }}>
          {isStreaming ? t('thinking.thinking', 'THINKING...') : t('thinking.thoughtProcess', 'THOUGHT PROCESS')}
        </Typography>
        <IconButton size="small" sx={{ p: 0.5 }}>
          {expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box
          sx={{
            p: 2,
            pt: 0,
            color: 'text.secondary',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            lineHeight: 1.6,
            maxHeight: 400,
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            '&::-webkit-scrollbar': {
                width: '6px',
            },
            '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
            },
          }}
        >
          {content}
          {isStreaming && (
            <Box
                component="span"
                sx={{
                    display: 'inline-block',
                    ml: 0.5,
                    animation: 'blink 1s infinite',
                    '@keyframes blink': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0 },
                    },
                }}
            >
              ▋
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
};
