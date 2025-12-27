import React, { useState } from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';

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
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

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
        disabled={disabled}
        variant="outlined"
        size="small"
      />
      <Tooltip title={t('messageInput.send', 'Send message')}>
        <span>
          <IconButton
            color="primary"
            disabled={disabled || submitting || !value.trim()}
            onClick={handleSend}
            aria-label={t('messageInput.send', 'Send message')}
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.06)',
              '&.Mui-disabled': {
                bgcolor: 'rgba(255,255,255,0.02)',
                color: 'rgba(255,255,255,0.3)',
              },
            }}
          >
            {submitting ? <CircularProgress size={20} /> : <SendIcon />}
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
};

