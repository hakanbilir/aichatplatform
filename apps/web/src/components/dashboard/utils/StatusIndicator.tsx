import React from 'react';
import { Chip } from '@mui/material';

// Color-coded status badges (success, warning, error, info)
// Renk kodlu durum rozetleri (başarı, uyarı, hata, bilgi)

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusIndicatorProps {
  // Status type / Durum tipi
  status: StatusType;
  // Status label / Durum etiketi
  label: string;
  // Size: 'small' | 'medium' / Boyut: 'small' | 'medium'
  size?: 'small' | 'medium';
  // Variant: 'filled' | 'outlined' / Varyant: 'filled' | 'outlined'
  variant?: 'filled' | 'outlined';
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  size = 'small',
  variant = 'filled',
  sx,
}) => {
  // Get color based on status / Duruma göre renk al
  const getStatusColor = (): 'success' | 'warning' | 'error' | 'info' | 'default' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'info':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get custom styles for neutral status / Nötr durum için özel stiller al
  const getNeutralStyles = () => {
    if (status === 'neutral') {
      return {
        backgroundColor: variant === 'filled' ? 'rgba(255,255,255,0.1)' : 'transparent',
        color: 'text.secondary',
        borderColor: 'rgba(255,255,255,0.2)',
      };
    }
    return {};
  };

  return (
    <Chip
      label={label}
      color={getStatusColor()}
      size={size}
      variant={variant}
      sx={{
        fontWeight: 600,
        fontSize: size === 'small' ? '0.7rem' : '0.75rem',
        height: size === 'small' ? 20 : 24,
        ...getNeutralStyles(),
        ...sx,
      }}
    />
  );
};

