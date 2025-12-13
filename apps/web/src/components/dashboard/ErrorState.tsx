import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

// Error display component with retry action
// Yeniden deneme eylemiyle hata görüntüleme bileşeni

export interface ErrorStateProps {
  // Error message / Hata mesajı
  message: string;
  // Optional error details / İsteğe bağlı hata detayları
  details?: string;
  // Retry button label / Yeniden deneme düğmesi etiketi
  retryLabel?: string;
  // Retry handler / Yeniden deneme işleyicisi
  onRetry?: () => void;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  details,
  retryLabel = 'Retry',
  onRetry,
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
      <ErrorOutlineIcon
        sx={{
          fontSize: '4rem',
          color: 'error.main',
          mb: 2,
          opacity: 0.8,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          mb: 1,
          color: 'error.main',
          fontWeight: 600,
        }}
      >
        {message}
      </Typography>
      {details && (
        <Typography
          variant="body2"
          sx={{
            mb: 3,
            color: 'text.secondary',
            maxWidth: '400px',
          }}
        >
          {details}
        </Typography>
      )}
      {onRetry && (
        <Button
          variant="contained"
          color="error"
          onClick={onRetry}
          sx={{
            mt: 1,
            textTransform: 'none',
            borderRadius: 2,
          }}
        >
          {retryLabel}
        </Button>
      )}
    </Box>
  );
};

