import React from 'react';
import { Box, CircularProgress, Skeleton, Typography, useTheme } from '@mui/material';

// Enhanced loading component with skeleton states
// İskelet durumlarıyla gelişmiş yükleme bileşeni

export interface LoadingStateProps {
  // Loading message / Yükleme mesajı
  message?: string;
  // Show skeleton instead of spinner / Spinner yerine iskelet göster
  skeleton?: boolean;
  // Skeleton variant: 'text' | 'circular' | 'rectangular' | 'rounded'
  skeletonVariant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  // Number of skeleton lines / İskelet satır sayısı
  skeletonLines?: number;
  // Full width skeleton / Tam genişlik iskelet
  fullWidth?: boolean;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  skeleton = false,
  skeletonVariant = 'text',
  skeletonLines = 3,
  fullWidth = false,
  sx,
}) => {
  const theme = useTheme();

  if (skeleton) {
    return (
      <Box sx={{ width: fullWidth ? '100%' : 'auto', ...sx }}>
        {skeletonVariant === 'text' ? (
          <>
            {Array.from({ length: skeletonLines }).map((_, index) => (
              <Skeleton
                key={index}
                variant="text"
                width={fullWidth ? '100%' : index === skeletonLines - 1 ? '60%' : '100%'}
                height={24}
                sx={{ mb: 1 }}
                animation="wave"
              />
            ))}
          </>
        ) : (
          <Skeleton
            variant={skeletonVariant}
            width={fullWidth ? '100%' : 200}
            height={fullWidth ? 200 : 200}
            animation="wave"
          />
        )}
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 6,
        px: 3,
        ...sx,
      }}
    >
      <CircularProgress
        size={48}
        sx={{
          color: theme.palette.primary.main,
          mb: message ? 2 : 0,
        }}
      />
      {message && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {message}
        </Typography>
      )}
    </Box>
  );
};

