import { useState, useRef, useEffect, memo, KeyboardEvent, ChangeEvent } from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string, images?: string[]) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
  isStreaming?: boolean;
  onStop?: () => void;
  isListening?: boolean;
  transcript?: string;
  onStartListening?: () => void;
  onStopListening?: () => void;
}

const MessageInputComponent = ({
  disabled,
  onSend,
  value: controlledValue,
  onChange,
  isStreaming = false,
  onStop,
  isListening = false,
  transcript = '',
  onStartListening,
  onStopListening
}: MessageInputProps) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice logic moved to parent
  
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
      // Transcript is now appended by parent or handled differently
      // But if we want to support appending while listening (if overlay is not used, or if overlay passes final text)
      // Actually, if using overlay, the transcript might be shown THERE, not here.
      // But typically we want the final result to land here.
      // Let's assume the parent handles appending to value, or we assume transcript is "live" and we don't append until done?
      // With the previous logic, it appended continuously.
      // Let's rely on the parent to update `value` if it wants to put text here.
      // Or we can keep the logic if `transcript` is passed.
      // However, if the overlay shows the transcript, maybe we don't want it here YET.
      // Let's assume the parent handles text insertion upon completion or live updates.
    }
  }, [transcript]); // Minimal effect

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

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isStreaming) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
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
    <Box display="flex" flexDirection="column">
      {/* Image Previews */}
      {images.length > 0 && (
        <Box display="flex" gap={1} px={2} pt={1} overflow="auto">
          {images.map((img, idx) => (
            <Box key={idx} position="relative" width={60} height={60} flexShrink={0}>
              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                aria-label={t('messageInput.removeImage', 'Remove image')}
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
            aria-label={t('messageInput.attach', 'Attach image')}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(33,150,243,0.08)' } }}
          >
            <AttachFileIcon />
          </IconButton>
        </Tooltip>

        {onStartListening && (
          <Tooltip title={isListening ? t('messageInput.stopListening', 'Stop listening') : t('messageInput.startListening', 'Voice input')}>
            <IconButton
              disabled={disabled || isStreaming}
              onClick={isListening ? onStopListening : onStartListening}
              color={isListening ? 'error' : 'default'}
              sx={{ color: isListening ? 'error.main' : 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(244,67,54,0.08)' } }}
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
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(0,0,0,0.2)',
              borderRadius: 3,
              '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
              '&.Mui-focused fieldset': { borderColor: 'primary.main' },
            }
          }}
        />
        <Tooltip title={isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')}>
          <span>
            <IconButton
              color={isStreaming ? "error" : "primary"}
              disabled={isActionDisabled}
              onClick={isStreaming ? handleStop : handleSend}
              aria-label={isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')}
              sx={{
                width: 42,
                height: 42,
                borderRadius: '50%',
                bgcolor: isStreaming ? 'rgba(244,67,54,0.1)' : 'rgba(33,150,243,0.1)',
                background: isActionDisabled ? undefined : (isStreaming ? undefined : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'),
                color: isActionDisabled ? undefined : (isStreaming ? 'error.main' : 'white'),
                boxShadow: isActionDisabled ? 'none' : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                transition: 'all 0.3s ease',
                '&:hover': {
                   bgcolor: isStreaming ? 'rgba(244,67,54,0.2)' : undefined,
                   transform: isActionDisabled ? 'none' : 'scale(1.05)',
                   boxShadow: isActionDisabled ? 'none' : '0 6px 10px 4px rgba(33, 203, 243, .3)',
                },
                '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.3)'
                }
              }}
            >
              {isStreaming ? <StopIcon /> : (submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />)}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
};

export const MessageInput = memo(MessageInputComponent);
MessageInput.displayName = 'MessageInput';
