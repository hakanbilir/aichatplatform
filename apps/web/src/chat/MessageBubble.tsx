import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  meta?: { images?: string[]; [key: string]: any };
  onRegenerate?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content, meta, onRegenerate }) => {
  const isUser = role === 'user';
  const images = meta?.images;

  return (
    <Box
      display="flex"
      justifyContent={isUser ? 'flex-end' : 'flex-start'}
      mb={1.2}
      className="micro-fade-in"
    >
      <Box
        display="flex"
        alignItems="flex-end"
        gap={1}
        sx={{ maxWidth: '80%' }}
      >
        <Box
          sx={{
            px: 1.8,
            py: 1.2,
            borderRadius: 3,
            bgcolor: isUser ? 'primary.main' : 'rgba(15,17,35,0.9)',
            color: 'white',
            border: isUser ? 'none' : '1px solid rgba(255,255,255,0.12)',
            boxShadow: isUser ? '0 14px 36px rgba(124,77,255,0.6)' : '0 10px 24px rgba(0,0,0,0.65)',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {images && images.length > 0 && (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {images.map((img, i) => (
                <Box
                  key={i}
                  component="img"
                  src={img}
                  alt="attachment"
                  sx={{
                    maxWidth: '100%',
                    maxHeight: 300,
                    borderRadius: 2,
                    objectFit: 'contain'
                  }}
                />
              ))}
            </Box>
          )}
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {content}
          </Typography>
        </Box>
        {!isUser && onRegenerate && (
          <Tooltip title="Regenerate">
            <IconButton size="small" onClick={onRegenerate} sx={{ opacity: 0.6, '&:hover': { opacity: 1 } }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

