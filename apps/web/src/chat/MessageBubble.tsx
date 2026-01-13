import React from 'react';
import { Box, Typography } from '@mui/material';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, images }) => {
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
        }}
      >
        {images && images.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
            {images.map((img, idx) => (
              <Box
                key={idx}
                component="img"
                src={`data:image/png;base64,${img}`}
                sx={{ maxWidth: '100%', maxHeight: 200, borderRadius: 1 }}
              />
            ))}
          </Box>
        )}
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      </Box>
    </Box>
  );
};
