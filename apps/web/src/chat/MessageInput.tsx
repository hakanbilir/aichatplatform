import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Badge, Tooltip } from '@mui/material';
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
    const content = value;
    const currentImages = images;
    setSubmitting(true);
    try {
      await onSend(content, currentImages.length > 0 ? currentImages : undefined);
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
      const newImages: string[] = [];
      const files = Array.from(e.target.files);

      let processed = 0;
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            newImages.push(reader.result as string);
          }
          processed++;
          if (processed === files.length) {
            setImages(prev => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Box display="flex" flexDirection="column" borderTop="1px solid rgba(255,255,255,0.12)">
      {images.length > 0 && (
        <Box display="flex" gap={1} px={2} pt={1} overflow="auto">
          {images.map((img, idx) => (
            <Box key={idx} position="relative" sx={{ width: 60, height: 60, flexShrink: 0 }}>
              <img src={img} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
              <IconButton
                size="small"
                onClick={() => removeImage(idx)}
                sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }, padding: 0.5 }}
              >
                <CloseIcon fontSize="small" sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Box display="flex" alignItems="center" gap={1} px={2} py={1.2}>
        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <Tooltip title={t('messageInput.attachImage') || "Attach Image"}>
          <IconButton disabled={disabled || submitting} onClick={() => fileInputRef.current?.click()}>
            <Badge badgeContent={images.length} color="secondary">
              <AttachFileIcon />
            </Badge>
          </IconButton>
        </Tooltip>

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
          disabled={disabled || submitting || (!value.trim() && images.length === 0)}
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

