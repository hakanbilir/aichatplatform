import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Chip, Stack } from '@mui/material';
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

// Helper to convert file to base64
const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result as string);
  reader.onerror = error => reject(error);
});

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
    const content = value;
    const imgs = images.length > 0 ? images : undefined;

    setSubmitting(true);
    try {
      await onSend(content, imgs);
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
          try {
            const base64 = await toBase64(file);
            newImages.push(base64);
          } catch (err) {
            console.error('Failed to read file', err);
          }
        }
      }
      setImages((prev) => [...prev, ...newImages]);
      // Reset input so same file can be selected again if needed
      e.target.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box borderTop="1px solid rgba(255,255,255,0.12)">
      {images.length > 0 && (
        <Stack direction="row" spacing={1} px={2} pt={1} overflow="auto">
          {images.map((img, idx) => (
            <Box key={idx} position="relative">
              <img src={img} alt="attachment" style={{ height: 60, borderRadius: 4, border: '1px solid #444' }} />
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                  p: 0.5,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
      <Box display="flex" alignItems="center" gap={1} px={2} py={1.2}>
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <IconButton onClick={() => fileInputRef.current?.click()} disabled={disabled || submitting}>
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

