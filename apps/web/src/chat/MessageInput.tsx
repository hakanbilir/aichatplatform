import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Chip, Avatar } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { Attachment } from '../hooks/useChat';

interface MessageInputProps {
  disabled?: boolean;
  onSend: (content: string, attachments: Attachment[]) => void;
  value?: string; // Controlled value for prompt insertion
  onChange?: (value: string) => void; // For controlled mode
}

export const MessageInput: React.FC<MessageInputProps> = ({ disabled, onSend, value: controlledValue, onChange }) => {
  const { t } = useTranslation('chat');
  const [internalValue, setInternalValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
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
    if ((!value.trim() && attachments.length === 0) || disabled) return;
    const content = value;
    const currentAttachments = [...attachments];
    setSubmitting(true);
    try {
      await onSend(content, currentAttachments);
      setValue('');
      setAttachments([]);
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
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            type: file.type.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            content: base64,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
    // reset input
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box display="flex" flexDirection="column" borderTop="1px solid rgba(255,255,255,0.12)">
      {attachments.length > 0 && (
        <Box px={2} pt={1} display="flex" gap={1} flexWrap="wrap">
          {attachments.map((att, i) => (
            <Chip
              key={i}
              label={att.name || 'Attachment'}
              avatar={att.type === 'image' ? <Avatar src={att.content} /> : undefined}
              onDelete={() => removeAttachment(i)}
              size="small"
            />
          ))}
        </Box>
      )}
      <Box display="flex" alignItems="center" gap={1} px={2} py={1.2}>
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileSelect}
          accept="image/*" // Restrict to images for now as backend/ui mostly handles images
        />
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || submitting}
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

