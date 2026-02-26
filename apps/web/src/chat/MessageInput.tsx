import {
  useState,
  useRef,
  useEffect,
  memo,
  KeyboardEvent,
  ChangeEvent,
  ClipboardEvent,
  DragEvent,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Box, IconButton, TextField, CircularProgress, Tooltip, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';

export interface MessageInputHandle {
  setValue: (value: string) => void;
  getValue: () => string;
  appendValue: (text: string) => void;
  focus: () => void;
}

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

const MessageInputComponent = forwardRef<MessageInputHandle, MessageInputProps>(
  function MessageInputComponentImpl(
    {
      disabled,
      onSend,
      value: controlledValue,
      onChange,
      isStreaming = false,
      onStop,
      isListening = false,
      transcript = '',
      onStartListening,
      onStopListening,
    },
    ref,
  ) {
    const { t } = useTranslation('chat');
    const [internalValue, setInternalValue] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // We need a ref for the text field to focus it
    const textFieldRef = useRef<HTMLDivElement>(null);

    // Determine current value: controlled takes precedence if provided
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    useImperativeHandle(ref, () => ({
      setValue: (newValue: string) => {
        if (!isControlled) {
          setInternalValue(newValue);
        }
        if (onChange) {
          onChange(newValue);
        }
      },
      getValue: () => value,
      appendValue: (text: string) => {
        const spacer = value && !value.endsWith(' ') ? ' ' : '';
        const newValue = value + spacer + text;

        if (!isControlled) {
          setInternalValue(newValue);
        }
        if (onChange) {
          onChange(newValue);
        }
      },
      focus: () => {
        // Attempt to find input inside TextField
        const input = textFieldRef.current?.querySelector('textarea');
        if (input) {
          input.focus();
        }
      },
    }));

    const setValue = (newValue: string) => {
      if (onChange) {
        onChange(newValue);
      }

      // Always update internal state to support uncontrolled mode or hybrid
      if (!isControlled) {
        setInternalValue(newValue);
      }
    };

    useEffect(() => {
      if (transcript) {
        // Transcript handling logic if needed.
        // Currently handled by parent via appendValue or ignored here.
      }
    }, [transcript]);

    const hasContent = value.trim().length > 0 || images.length > 0;

    const isActionDisabled = isStreaming ? !onStop : disabled || submitting || !hasContent;

    const handleSend = async () => {
      if (isActionDisabled) return;
      const content = value;
      const imgs = images;

      // Optimization: Clear input immediately for better UI responsiveness (Optimistic UI)
      setValue('');
      setImages([]);

      setSubmitting(true);
      try {
        await onSend(content, imgs);
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

    const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
      if (e.clipboardData.files && e.clipboardData.files.length > 0) {
        const files = Array.from(e.clipboardData.files);
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          e.preventDefault();
          imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                setImages((prev) => [...prev, reader.result as string]);
              }
            };
            reader.readAsDataURL(file);
          });
        }
      }
    };

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setImages((prev) => [...prev, reader.result as string]);
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
      setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const imageFiles = files.filter((file) => file.type.startsWith('image/'));

        if (imageFiles.length > 0) {
          imageFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                setImages((prev) => [...prev, reader.result as string]);
              }
            };
            reader.readAsDataURL(file);
          });
        }
      }
    };

    return (
      <Box
        display="flex"
        flexDirection="column"
        position="relative"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          borderRadius: 3,
          transition: 'all 0.2s ease',
          outline: isDragging ? '2px dashed #2196F3' : '2px dashed transparent',
          outlineOffset: '-4px',
          bgcolor: isDragging ? 'rgba(33, 150, 243, 0.08)' : 'transparent',
        }}
      >
        {isDragging && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            zIndex={10}
            display="flex"
            alignItems="center"
            justifyContent="center"
            bgcolor="rgba(0,0,0,0.6)"
            borderRadius={3}
            sx={{ backdropFilter: 'blur(2px)' }}
          >
            <Typography variant="h6" color="white" fontWeight="bold">
              {t('messageInput.dropToAttach', 'Drop to attach')}
            </Typography>
          </Box>
        )}

        {/* Image Previews */}
        {images.length > 0 && (
          <Box display="flex" gap={1} px={2} pt={1} overflow="auto">
            {images.map((img, idx) => (
              <Box key={idx} position="relative" width={60} height={60} flexShrink={0}>
                <img
                  src={img}
                  alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                />
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
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
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
              data-ai-action="attach-file"
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'rgba(33,150,243,0.08)' },
              }}
            >
              <AttachFileIcon />
            </IconButton>
          </Tooltip>

          {onStartListening && (
            <Tooltip
              title={
                isListening
                  ? t('messageInput.stopListening', 'Stop listening')
                  : t('messageInput.startListening', 'Voice input')
              }
            >
              <IconButton
                disabled={disabled || isStreaming}
                onClick={isListening ? onStopListening : onStartListening}
                color={isListening ? 'error' : 'default'}
                data-ai-action={isListening ? 'stop-voice-input' : 'start-voice-input'}
                sx={{
                  color: isListening ? 'error.main' : 'text.secondary',
                  '&:hover': { color: 'error.main', bgcolor: 'rgba(244,67,54,0.08)' },
                }}
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
          )}

          <TextField
            ref={textFieldRef}
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
            onPaste={handlePaste}
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
              },
            }}
          />
          <Tooltip
            title={isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')}
          >
            <span>
              <IconButton
                color={isStreaming ? 'error' : 'primary'}
                disabled={isActionDisabled}
                onClick={isStreaming ? handleStop : handleSend}
                aria-label={
                  isStreaming ? t('messageInput.stop', 'Stop generating') : t('messageInput.send')
                }
                data-ai-action={isStreaming ? 'stop-generation' : 'send-message'}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  bgcolor: isStreaming ? 'rgba(244,67,54,0.1)' : 'rgba(33,150,243,0.1)',
                  background: isActionDisabled
                    ? undefined
                    : isStreaming
                      ? undefined
                      : 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  color: isActionDisabled ? undefined : isStreaming ? 'error.main' : 'white',
                  boxShadow: isActionDisabled ? 'none' : '0 3px 5px 2px rgba(33, 203, 243, .3)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: isStreaming ? 'rgba(244,67,54,0.2)' : undefined,
                    transform: isActionDisabled ? 'none' : 'scale(1.05)',
                    boxShadow: isActionDisabled ? 'none' : '0 6px 10px 4px rgba(33, 203, 243, .3)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.3)',
                  },
                }}
              >
                {isStreaming ? (
                  <StopIcon />
                ) : submitting ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>
    );
  },
);

export const MessageInput = memo(MessageInputComponent);
MessageInput.displayName = 'MessageInput';
