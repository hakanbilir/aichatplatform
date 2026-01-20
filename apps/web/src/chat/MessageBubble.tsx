import React from 'react';
import { Box } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';
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
          fontSize: '0.875rem',
          '& p': {
            m: 0,
            mb: 1,
            '&:last-child': {
              mb: 0
            },
            lineHeight: 1.6
          },
          '& a': {
            color: 'inherit',
            textDecoration: 'underline'
          },
          '& code': {
            fontFamily: 'monospace',
            backgroundColor: 'rgba(0,0,0,0.2)',
            padding: '2px 4px',
            borderRadius: '4px',
            fontSize: '0.85em'
          },
          '& pre': {
            backgroundColor: 'rgba(0,0,0,0.3)',
            padding: '12px',
            borderRadius: '8px',
            overflowX: 'auto',
            my: 1,
            '& code': {
              backgroundColor: 'transparent',
              padding: 0,
              color: '#e6e6e6'
            }
          },
          '& ul, & ol': {
            m: 0,
            mb: 1,
            pl: 3,
            '&:last-child': {
              mb: 0
            }
          },
          '& li': {
            mb: 0.5,
            lineHeight: 1.5
          },
          '& table': {
            width: '100%',
            borderCollapse: 'collapse',
            my: 1,
            fontSize: '0.85em'
          },
          '& th, & td': {
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '6px 12px',
            textAlign: 'left'
          },
          '& th': {
            backgroundColor: 'rgba(255,255,255,0.1)',
            fontWeight: 600
          },
          '& blockquote': {
            borderLeft: '4px solid rgba(255,255,255,0.3)',
            m: 0,
            my: 1,
            pl: 2,
            fontStyle: 'italic',
            opacity: 0.8
          }
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};
