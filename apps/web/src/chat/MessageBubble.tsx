import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

const ThinkingBlock: React.FC<{ thought: string }> = ({ thought }) => {
  return (
    <Box
      sx={{
        mb: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: 'rgba(0, 0, 0, 0.2)',
        borderLeft: '2px solid rgba(255, 255, 255, 0.3)',
      }}
    >
      <details>
        <summary style={{ cursor: 'pointer', opacity: 0.7, fontSize: '0.8rem', userSelect: 'none' }}>
          Thinking Process
        </summary>
        <Typography
          variant="caption"
          component="div"
          sx={{ mt: 1, whiteSpace: 'pre-wrap', color: 'rgba(255, 255, 255, 0.7)', fontFamily: 'monospace' }}
        >
          {thought}
        </Typography>
      </details>
    </Box>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';

  const { thought, mainContent } = useMemo(() => {
    const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
    if (thinkMatch) {
      return {
        thought: thinkMatch[1].trim(),
        mainContent: content.replace(thinkMatch[0], '').trim(),
      };
    }
    return { thought: null, mainContent: content };
  }, [content]);

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
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
          '& p': { m: 0, mb: 1 },
          '& p:last-child': { mb: 0 },
          '& pre': {
             bgcolor: 'rgba(0,0,0,0.3)',
             p: 1,
             borderRadius: 1,
             overflowX: 'auto',
             my: 1
          },
          '& code': {
             fontFamily: 'monospace',
             bgcolor: 'rgba(255,255,255,0.1)',
             borderRadius: 0.5,
             px: 0.5
          },
          '& a': {
            color: 'inherit',
            textDecoration: 'underline'
          }
        }}
      >
        {thought && <ThinkingBlock thought={thought} />}
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {mainContent}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};
