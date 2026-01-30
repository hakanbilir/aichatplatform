import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string, images?: string[]) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
  isStreaming?: boolean;
  onStop?: () => void;
}

const MessageInputComponent: React.FC<MessageInputProps> = ({
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
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, startListening, stopListening, resetTranscript, supported: speechSupported } = useSpeechToText();
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  useEffect(() => {
    if (transcript) {
      setValue(value + (value && !value.endsWith(' ') ? ' ' : '') + transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript, value, setValue]);

  const hasContent = value.trim().length > 0 || images.length > 0;
  // If streaming, send button becomes stop button, so it is not disabled unless onStop is missing
  // If not streaming, check disabled/submitting/content
  const isActionDisabled = isStreaming
    ? !onStop
    : (disabled || submitting || !hasContent);

  const handleSend = async () => {
    if (isActionDisabled) return;
    const content = value;
    const imgs = images;
    setSubmitting(true);
    try {
      await onSend(content, imgs);
      setValue('');
      setImages([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    }
    // Reset value so same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box display="flex" flexDirection="column" borderTop="1px solid rgba(255,255,255,0.12)">
      {/* Image Previews */}
      {images.length > 0 && (
        <Box display="flex" gap={1} px={2} pt={1} overflow="auto">
          {images.map((img, idx) => (
            <Box key={idx} position="relative" width={60} height={60} flexShrink={0}>
              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                sx={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  width: 20,
                  height: 20,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box display="flex" alignItems="center" gap={1} px={2} py={1.2}>
         <input
          type="file"
          accept="image/*"
          hidden
          ref={fileInputRef}
          onChange={handleFileSelect}
        />
        <Tooltip title={t('messageInput.attach', 'Attach image')}>
          <IconButton
            disabled={disabled || isStreaming}
            onClick={() => fileInputRef.current?.click()}
            sx={{ color: 'text.secondary' }}
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {speechSupported && (
          <Tooltip title={isListening ? t('messageInput.stopListening', 'Stop listening') : t('messageInput.startListening', 'Voice input')}>
            <IconButton
              disabled={disabled || isStreaming}
              onClick={isListening ? stopListening : startListening}
              color={isListening ? 'error' : 'default'}
              sx={{ color: isListening ? 'error.main' : 'text.secondary' }}
            >
              {isListening ? <MicOffIcon /> : <MicIcon />}
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
    </Box>
  );
};

export const MessageInput = React.memo(MessageInputComponent);
MessageInput.displayName = 'MessageInput';
