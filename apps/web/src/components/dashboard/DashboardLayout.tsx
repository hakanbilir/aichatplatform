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
  columns = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4 },
  gap = 2,
  sx,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: `repeat(${columns.xs || 1}, 1fr)`,
          sm: `repeat(${columns.sm || 2}, 1fr)`,
          md: `repeat(${columns.md || 2}, 1fr)`,
          lg: `repeat(${columns.lg || 3}, 1fr)`,
          xl: `repeat(${columns.xl || 4}, 1fr)`,
        },
        gap: theme.spacing(gap),
        width: '100%',
        ...sx,
      }}
    >
      {children}
    </Box>
  );
};

