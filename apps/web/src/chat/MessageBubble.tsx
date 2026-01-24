import React from 'react';
import { Box, Typography } from '@mui/material';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  meta?: any;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, meta }) => {
  const isUser = role === 'user';
  const attachments = meta?.attachments || [];

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
    >
      <Box
        display="flex"
        flexDirection="column"
        alignItems={isUser ? 'flex-end' : 'flex-start'}
        sx={{ maxWidth: '80%' }}
      >
        {attachments.length > 0 && (
          <Box display="flex" gap={1} flexWrap="wrap" mb={0.5} justifyContent={isUser ? 'flex-end' : 'flex-start'}>
            {attachments.map((att: any, i: number) => (
              att.type === 'image' && att.content ? (
                <Box
                  key={i}
                  component="img"
                  src={att.content}
                  alt={att.name || 'Attachment'}
                  sx={{
                    maxWidth: 200,
                    maxHeight: 200,
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
              ) : null
            ))}
          </Box>
        )}
        <Box
          sx={{
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
      </Box>
    </Box>
  );
};

