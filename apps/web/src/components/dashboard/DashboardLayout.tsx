import React from 'react';
import { Box, useTheme } from '@mui/material';

// Responsive grid layout system for dashboard pages
// Dashboard sayfaları için duyarlı ızgara düzen sistemi

export interface DashboardLayoutProps {
  // Child components / Alt bileşenler
  children: React.ReactNode;
  // Number of columns on different breakpoints / Farklı kırılma noktalarında sütun sayısı
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  // Gap between items / Öğeler arası boşluk
  gap?: number;
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  columns, // Deprecated in favor of auto-fit bento grid, but kept for signature compatibility
  gap,
  sx,
}) => {
  return (
    <Box
      className="bento-grid"
      sx={{
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

