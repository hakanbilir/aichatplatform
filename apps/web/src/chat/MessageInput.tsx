import React, { useRef } from 'react';
import { Box, IconButton, TextField, CircularProgress, Chip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { Attachment } from '../api/chat';

interface MessageInputProps {
  disabled?: boolean;
  onSend: () => void;
  value: string;
  onChange: (value: string) => void;
  attachments?: Attachment[];
  onFileSelect?: (files: FileList | null) => void;
  onRemoveAttachment?: (index: number) => void;
  isSubmitting?: boolean;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  disabled,
  onSend,
  value,
  onChange,
  attachments = [],
  onFileSelect,
  onRemoveAttachment,
  isSubmitting = false
}) => {
  const { t } = useTranslation('chat');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <Box display="flex" flexDirection="column" borderTop="1px solid rgba(255,255,255,0.12)">
      {attachments.length > 0 && (
        <Box px={2} pt={1} display="flex" gap={1} flexWrap="wrap">
           {attachments.map((att, idx) => (
             <Chip
               key={idx}
               label={att.name}
               onDelete={() => onRemoveAttachment?.(idx)}
               size="small"
               variant="outlined"
               sx={{ maxWidth: 200 }}
             />
           ))}
        </Box>
      )}
      <Box display="flex" alignItems="center" gap={1} px={2} py={1.2}>
        <input
          type="file"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={(e) => {
            onFileSelect?.(e.target.files);
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
        <IconButton
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isSubmitting}
          size="small"
          sx={{ color: 'rgba(255,255,255,0.7)' }}
        >
           <AttachFileIcon />
        </IconButton>
        <TextField
          fullWidth
          multiline
          maxRows={5}
          placeholder={t('messageInput.placeholder')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          variant="outlined"
          size="small"
        />
        <IconButton
          color="primary"
          disabled={disabled || isSubmitting || (!value.trim() && attachments.length === 0)}
          onClick={() => onSend()}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        >
          {isSubmitting ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};
