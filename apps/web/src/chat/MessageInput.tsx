import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Badge, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string, images?: string[]) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
}

export const MessageInput: React.FC<MessageInputProps> = ({ disabled, onSend, value: controlledValue, onChange }) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  const setValue = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setInternalValue(newValue);
    }
  };

  const handleSend = async () => {
    if ((!value.trim() && images.length === 0) || disabled) return;
    setSubmitting(true);
    try {
      await onSend(value, images.length > 0 ? images : undefined);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
             // Remove data URL prefix to get raw base64 if needed,
             // but usually we keep it for display and stripping it before sending depends on API.
             // Our API likely expects full data URL or just base64.
             // Looking at Ollama client, it expects base64 string.
             // Standard data URL: data:image/png;base64,.....
             const base64 = reader.result.split(',')[1];
             if (base64) {
               setImages(prev => [...prev, base64]);
             }
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box display="flex" flexDirection="column" gap={1} px={2} py={1.2} borderTop="1px solid rgba(255,255,255,0.12)">

      {/* Image Previews */}
      {images.length > 0 && (
        <Box display="flex" gap={1} overflow="auto" pb={1}>
          {images.map((img, idx) => (
            <Badge
              key={idx}
              overlap="circular"
              anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
              badgeContent={
                <IconButton
                  size="small"
                  onClick={() => removeImage(idx)}
                  sx={{ bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 20, height: 20, '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' } }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              }
            >
              <Avatar variant="rounded" src={`data:image/png;base64,${img}`} sx={{ width: 60, height: 60, border: '1px solid rgba(255,255,255,0.2)' }} />
            </Badge>
          ))}
        </Box>
      )}

      <Box display="flex" alignItems="center" gap={1}>
        <input
          type="file"
          accept="image/*"
          multiple
          hidden
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || submitting}
          sx={{ color: 'text.secondary' }}
        >
          <AttachFileIcon />
        </IconButton>

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
    </Box>
  );
};
