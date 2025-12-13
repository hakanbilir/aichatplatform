import React from 'react';
import { Box, Typography, Button } from '@mui/material';

// Consistent empty state component with icon, message, and action
// İkon, mesaj ve eylemle tutarlı boş durum bileşeni

export interface EmptyStateProps {
  // Icon to display / Görüntülenecek ikon
  icon?: React.ReactNode;
  // Main message / Ana mesaj
  message: string;
  // Optional description / İsteğe bağlı açıklama
  description?: string;
  // Action button label / Eylem düğmesi etiketi
  actionLabel?: string;
  // Action button handler / Eylem düğmesi işleyicisi
  onAction?: () => void;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  message,
  description,
  actionLabel,
  onAction,
  sx,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        textAlign: 'center',
        ...sx,
      }}
    >
      {icon && (
        <Box
          sx={{
            mb: 2,
            opacity: 0.6,
            fontSize: '4rem',
            color: 'text.secondary',
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          color: 'text.primary',
          fontWeight: 600,
        }}
      >
        {message}
      </Typography>
      {description && (
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: 'text.secondary',
            maxWidth: '400px',
          }}
        >
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{
            mt: 1,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
};

