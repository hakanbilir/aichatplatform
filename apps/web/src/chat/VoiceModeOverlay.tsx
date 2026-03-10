import React, { useEffect, useState, memo } from 'react';
import { Box, IconButton, Typography, Fade } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { useTranslation } from 'react-i18next';

import { KineticTypography } from '../components/ui/kinetic/KineticTypography';

interface VoiceModeOverlayProps {
  isListening: boolean;
  transcript: string;
  onStop: () => void;
}

const VoiceModeOverlayComponent: React.FC<VoiceModeOverlayProps> = ({
  isListening,
  transcript,
  onStop,
}) => {
  const { t } = useTranslation('chat');
  const [dots, setDots] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isListening) {
      interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <Fade in={isListening} unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          bgcolor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          p: 3,
        }}
      >
        <Box textAlign="center">
          <KineticTypography variant="h3" sx={{ color: 'white', mb: 2 }}>
            {t('voiceMode.listening', 'Listening')}
            {dots}
          </KineticTypography>
          <Typography variant="h5" sx={{ color: 'rgba(255,255,255,0.7)', maxWidth: '800px' }}>
            {transcript || t('voiceMode.speakNow', 'Start speaking...')}
          </Typography>
        </Box>

        <Box
          sx={{
            position: 'relative',
            width: 80,
            height: 80,
            '&::before': {
              content: '""',
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              animation: 'pulse 2s infinite',
              border: '2px solid rgba(255,255,255,0.2)',
            },
            '@keyframes pulse': {
              '0%': { width: '100%', height: '100%', opacity: 1 },
              '100%': { width: '200%', height: '200%', opacity: 0 },
            },
          }}
        >
          <IconButton
            onClick={onStop}
            sx={{
              width: '100%',
              height: '100%',
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': { bgcolor: 'error.dark' },
            }}
            data-ai-action="onstop"
          >
            <StopIcon sx={{ fontSize: 40 }} />
          </IconButton>
        </Box>
      </Box>
    </Fade>
  );
};

// Optimized with React.memo to prevent unnecessary re-renders during chat streaming,
// as the parent ChatPage re-renders heavily on every token but voice state remains stable.
export const VoiceModeOverlay = memo(VoiceModeOverlayComponent);
