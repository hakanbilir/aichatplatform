import React, { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ThinkingBlock } from './ThinkingBlock';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ role, content }) => {
  const isUser = role === 'user';

  const { thought, response } = useMemo(() => {
    if (isUser) return { thought: null, response: content };

    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/;
    const match = content.match(thinkRegex);

    if (match) {
      const thoughtContent = match[1];
      const responseContent = content.replace(match[0], '').trim();
      return { thought: thoughtContent, response: responseContent };
    }

    return { thought: null, response: content };
  }, [content, isUser]);

  const isThinkingStreaming = useMemo(() => {
      if (!thought) return false;
      return !content.includes('</think>');
  }, [content, thought]);

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
    >
      <Box
        sx={{
          maxWidth: '85%',
          px: 2,
          py: 1.5,
          borderRadius: 3,
          bgcolor: isUser ? 'primary.main' : 'rgba(15,17,35,0.9)',
          color: 'white',
          border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : '0 10px 24px rgba(0,0,0,0.65)',
          overflowWrap: 'break-word',
          '& p': { m: 0, mb: 1 },
          '& p:last-child': { mb: 0 },
          '& pre': {
            bgcolor: 'rgba(0,0,0,0.5)',
            p: 1.5,
            borderRadius: 1,
            overflowX: 'auto',
            my: 1,
            border: '1px solid rgba(255,255,255,0.1)'
          },
          '& code': {
            fontFamily: 'monospace',
            bgcolor: 'rgba(255,255,255,0.1)',
            px: 0.5,
            borderRadius: 0.5,
            fontSize: '0.9em'
          },
          '& a': { color: '#82b1ff', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } },
          '& ul, & ol': { pl: 3, mb: 1 },
          '& blockquote': {
              borderLeft: '3px solid rgba(255,255,255,0.3)',
              pl: 1.5,
              my: 1,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.7)'
          },
          '& table': {
              borderCollapse: 'collapse',
              width: '100%',
              my: 1,
              '& th, & td': {
                  border: '1px solid rgba(255,255,255,0.2)',
                  px: 1,
                  py: 0.5
              },
              '& th': {
                  bgcolor: 'rgba(255,255,255,0.1)'
              }
          }
        }}
      >
        {thought && (
            <ThinkingBlock content={thought} isStreaming={isThinkingStreaming} />
        )}

        {isUser ? (
           <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
             {response}
           </Typography>
        ) : (
           <ReactMarkdown remarkPlugins={[remarkGfm]}>
             {response || (thought ? '' : content)}
           </ReactMarkdown>
        )}
      </Box>
    </Box>
  );
});
