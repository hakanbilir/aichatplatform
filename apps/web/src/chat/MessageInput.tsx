import React, { useState } from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
  isStreaming?: boolean;
  onStop?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  onSend,
  value: controlledValue,
  onChange,
  isStreaming = false,
  onStop
}) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const hasContent = value.trim().length > 0;
  // If streaming, send button becomes stop button, so it is not disabled unless onStop is missing
  // If not streaming, check disabled/submitting/content
  const isActionDisabled = isStreaming
    ? !onStop
    : (disabled || submitting || !hasContent);

  const handleSend = async () => {
    if (isActionDisabled) return;
    const content = value;
    setSubmitting(true);
    try {
      await onSend(content);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStop = () => {
    if (onStop) onStop();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={1} px={2} py={1.2} borderTop="1px solid rgba(255,255,255,0.12)">
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
        disabled={disabled && !isStreaming}
        variant="outlined"
        size="small"
      />
      <Tooltip title={isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')}>
        <span>
          <IconButton
            color={isStreaming ? "error" : "primary"}
            disabled={isActionDisabled}
            onClick={isStreaming ? handleStop : handleSend}
            aria-label={isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: isStreaming ? 'rgba(244,67,54,0.1)' : 'rgba(255,255,255,0.06)',
              '&:hover': {
                 bgcolor: isStreaming ? 'rgba(244,67,54,0.2)' : undefined,
              }
            }}
          >
            {isStreaming ? <StopIcon /> : (submitting ? <CircularProgress size={20} /> : <SendIcon />)}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

