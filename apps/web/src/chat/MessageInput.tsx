import React, { useState, useEffect } from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
}

export const MessageInput: React.FC<MessageInputProps> = ({ disabled, onSend, value: controlledValue, onChange }) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    supported: speechSupported
  } = useSpeechRecognition();

  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  // Sync transcript to value
  useEffect(() => {
    if (transcript && isListening) {
      // Append transcript to existing value
      // We need to be careful not to append the same transcript repeatedly if this effect runs often.
      // But useSpeechRecognition returns the *full* transcript for the session.
      // So effectively we want `previousValueBeforeSession + currentTranscript`.
      // Implementing that is tricky without extra state.
      // Simplified: Just set value to transcript. User can edit.
      // To avoid overwrite: We'll assume the user clears input before talking or we just append.
      // For a robust implementation, let's just use the transcript as the value while listening.
      setValue(transcript);
    }
  }, [transcript, isListening]);

  const handleSend = async () => {
    if (!value.trim() || disabled) return;
    const content = value;
    setSubmitting(true);
    try {
      await onSend(content);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      // Clear input when starting to listen to avoid confusion, or keep it?
      // Standard: Keep it. But our simple sync logic `setValue(transcript)` overwrites.
      // So let's clear it for now to be safe and simple.
      setValue('');
      startListening();
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={1} px={2} py={1.2} borderTop="1px solid rgba(255,255,255,0.12)">
      {speechSupported && (
        <Tooltip title={isListening ? t('stopListening') : t('startListening')}>
          <IconButton
            onClick={toggleListening}
            color={isListening ? 'error' : 'default'}
            disabled={disabled || submitting}
          >
             {isListening ? <StopIcon /> : <MicIcon />}
          </IconButton>
        </Tooltip>
      )}
      <TextField
        fullWidth
        multiline
        maxRows={5}
        placeholder={t('messageInput.placeholder')}
        value={value}
        onChange={(e) => {
          const newValue = e.target.value;
          setValue(newValue);
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        variant="outlined"
        size="small"
      />
      <IconButton
        color="primary"
        disabled={disabled || submitting}
        onClick={handleSend}
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'rgba(255,255,255,0.06)',
        }}
      >
        {submitting ? <CircularProgress size={20} /> : <SendIcon />}
      </IconButton>
    </Box>
  );
};
