import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import StopIcon from '@mui/icons-material/Stop';
import { useSpeechSynthesis } from '../hooks/useSpeechSynthesis';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ role, content }) => {
  const isUser = role === 'user';
  const { speak, speaking, cancel, supported } = useSpeechSynthesis();

  const handleSpeak = () => {
    if (speaking) {
      cancel();
    } else {
      speak(content);
    }
  };

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
          position: 'relative',
          '&:hover .speech-btn': {
            opacity: 1,
          },
        }}
      >
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>

        {supported && !isUser && (
           <Box
             className="speech-btn"
             sx={{
               position: 'absolute',
               bottom: -20,
               right: 0,
               opacity: 0,
               transition: 'opacity 0.2s',
             }}
           >
             <Tooltip title="Read Aloud">
               <IconButton size="small" onClick={handleSpeak} sx={{ color: 'rgba(255,255,255,0.7)' }}>
                 {speaking ? <StopIcon fontSize="small" /> : <VolumeUpIcon fontSize="small" />}
               </IconButton>
             </Tooltip>
           </Box>
        )}
      </Box>
    </Box>
  );
};
