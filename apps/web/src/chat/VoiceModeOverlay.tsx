import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, IconButton, Fade, Backdrop } from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { keyframes } from '@mui/system';

// Pulsing animation
const pulse = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
`;

const ripple = keyframes`
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(2); opacity: 0; }
`;

interface VoiceModeOverlayProps {
  open: boolean;
  onClose: () => void;
  onSend: (content: string) => void;
  isStreaming: boolean;
  streamingText: string;
  latestAssistantMessageContent?: string;
}

export const VoiceModeOverlay: React.FC<VoiceModeOverlayProps> = ({
  open,
  onClose,
  onSend,
  isStreaming,
  streamingText,
  latestAssistantMessageContent
}) => {
  const { t } = useTranslation('chat');
  const { speak, stop: stopSpeaking, speaking } = useTextToSpeech();
  const { startListening, stopListening, transcript, resetTranscript, supported } = useSpeechToText();

  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const silenceTimer = useRef<any | null>(null);
  const [displayText, setDisplayText] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setStatus('listening');
      startListening();
      setDisplayText('');
    } else {
      stopSpeaking();
      stopListening();
      setStatus('idle');
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    }
  }, [open, startListening, stopSpeaking, stopListening]);

  // Handle Silence Detection
  useEffect(() => {
    if (status !== 'listening' || !transcript) return;

    setDisplayText(transcript);

    if (silenceTimer.current) clearTimeout(silenceTimer.current);

    // Wait 2 seconds of silence before sending
    silenceTimer.current = setTimeout(() => {
      if (transcript.trim()) {
        setStatus('processing');
        stopListening();
        onSend(transcript);
        resetTranscript();
        setDisplayText('');
      }
    }, 2000);

    return () => {
      if (silenceTimer.current) clearTimeout(silenceTimer.current);
    };
  }, [transcript, status, stopListening, onSend, resetTranscript]);

  // Handle Streaming State
  useEffect(() => {
    if (isStreaming) {
      setStatus('processing');
      setDisplayText(streamingText);
    } else if (status === 'processing') {
      // Streaming finished
      setStatus('speaking');
      // Speak the result
      const textToSpeak = streamingText || latestAssistantMessageContent || '';
      setDisplayText(textToSpeak);
      if (textToSpeak) {
        speak(textToSpeak);
      } else {
        // Nothing to speak? Go back to listening
        setStatus('listening');
        startListening();
      }
    }
  }, [isStreaming, streamingText, status, latestAssistantMessageContent, speak, startListening]);

  // Handle Speaking End
  useEffect(() => {
    if (status === 'speaking' && !speaking) {
      // Finished speaking, start listening again
      setStatus('listening');
      setDisplayText('');
      startListening();
    }
  }, [speaking, status, startListening]);

  if (!open) return null;

  return (
    <Backdrop
      open={open}
      sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, backdropFilter: 'blur(10px)' }}
    >
      <GlassPanel
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(0,0,0,0.4)',
          position: 'relative',
          border: 'none',
          boxShadow: 'none'
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', top: 20, right: 20, color: 'white' }}
        >
          <CloseIcon />
        </IconButton>

        <Box position="relative" mb={4}>
            {/* Visualizer */}
            <Box
              sx={{
                width: 120,
                height: 120,
                borderRadius: '50%',
                bgcolor: status === 'listening' ? 'primary.main' : (status === 'speaking' ? 'secondary.main' : 'grey.700'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: status === 'listening' || status === 'speaking' ? `${pulse} 2s infinite` : 'none',
                boxShadow: '0 0 40px rgba(0,0,0,0.5)'
              }}
            >
                <MicIcon sx={{ fontSize: 60 }} />
            </Box>

             {/* Ripples */}
             {(status === 'listening' || status === 'speaking') && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.5)',
                    animation: `${ripple} 2s infinite`
                  }}
                />
             )}
        </Box>

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          {status === 'listening' ? t('voiceMode.listening', 'Listening...') :
           status === 'processing' ? t('voiceMode.thinking', 'Thinking...') :
           status === 'speaking' ? t('voiceMode.speaking', 'Speaking...') :
           t('voiceMode.idle', 'Idle')}
        </Typography>

        <Box maxWidth="600px" width="100%" px={3} textAlign="center" minHeight="100px">
          <Fade in={!!displayText}>
             <Typography variant="body1" sx={{ opacity: 0.8 }}>
               {displayText}
             </Typography>
          </Fade>
        </Box>

        {!supported && (
            <Typography color="error" mt={2}>
                {t('voiceMode.notSupported', 'Speech API not supported in this browser.')}
            </Typography>
        )}

      </GlassPanel>
    </Backdrop>
  );
};
