import React, { useState, useRef, useEffect } from 'react';
import { Box, IconButton, TextField, CircularProgress, Badge, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string, images: string[]) => void; // Updated signature
  value?: string;
  onChange?: (value: string) => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({ disabled, onSend, value: controlledValue, onChange }) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
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
    if (transcript) {
      setValue(value ? value + ' ' + transcript : transcript);
      resetTranscript();
    }
  }, [transcript, resetTranscript, value]);

  const handleSend = async () => {
    if ((!value.trim() && images.length === 0) || disabled) return;
    const content = value;
    const currentImages = [...images];

    setSubmitting(true);
    try {
      await onSend(content, currentImages);
      setValue('');
      setImages([]);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newImages: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        if (file.type.startsWith('image/')) {
          const base64 = await convertToBase64(file);
          newImages.push(base64);
        }
      }
      setImages(prev => [...prev, ...newImages]);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  return (
    <Box flexDirection="column" display="flex" width="100%">
      {/* Image Previews */}
      {images.length > 0 && (
        <Box display="flex" gap={1} px={2} pt={1} overflow="auto">
          {images.map((img, idx) => (
            <Box key={idx} position="relative" width={60} height={60} flexShrink={0}>
              <img src={img} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
              >
                <CloseIcon fontSize="small" sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      <Box display="flex" alignItems="end" gap={1} px={2} py={1.2} borderTop="1px solid rgba(255,255,255,0.12)">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          multiple
          onChange={handleFileSelect}
        />

        <Tooltip title={t('messageInput.attachImage') || "Attach Image"}>
           <span>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || submitting}
              sx={{ color: 'text.secondary' }}
            >
              <AttachFileIcon />
            </IconButton>
           </span>
        </Tooltip>

        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder={t('messageInput.placeholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          variant="outlined"
          size="small"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3
            }
          }}
        />

        {speechSupported && (
          <Tooltip title={isListening ? (t('messageInput.stopListening') || "Stop Listening") : (t('messageInput.startListening') || "Start Listening")}>
            <span>
              <IconButton
                color={isListening ? 'error' : 'default'}
                onClick={isListening ? stopListening : startListening}
                disabled={disabled || submitting}
              >
                 {isListening ? <StopIcon /> : <MicIcon />}
              </IconButton>
            </span>
          </Tooltip>
        )}

        <IconButton
          color="primary"
          disabled={disabled || submitting || (!value.trim() && images.length === 0)}
          onClick={handleSend}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
            flexShrink: 0
          }}
        >
          {submitting ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};
