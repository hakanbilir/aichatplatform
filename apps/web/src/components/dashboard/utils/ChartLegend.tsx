import React from 'react';
import { Box, Typography } from '@mui/material';

// Custom legend component for charts
// Grafikler için özel gösterge bileşeni

export interface ChartLegendItem {
  // Item name / Öğe adı
  name: string;
  // Item color / Öğe rengi
  color: string;
  // Item value (optional) / Öğe değeri (isteğe bağlı)
  value?: number | string;
}

export interface ChartLegendProps {
  // Legend items / Gösterge öğeleri
  items: ChartLegendItem[];
  // Layout: 'horizontal' | 'vertical' / Düzen: 'horizontal' | 'vertical'
  layout?: 'horizontal' | 'vertical';
  // Custom sx props / Özel sx prop'ları
  sx?: object;
}

export const ChartLegend: React.FC<ChartLegendProps> = ({
  items,
  layout = 'horizontal',
  sx,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: layout === 'vertical' ? 'column' : 'row',
        flexWrap: 'wrap',
        gap: 2,
        ...sx,
      }}
    >
      {items.map((item, index) => (
        <Box
          key={index}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: item.color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.75rem',
            }}
          >
            {item.name}
          </Typography>
          {item.value !== undefined && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.primary',
                fontWeight: 600,
                fontSize: '0.75rem',
                ml: 0.5,
              }}
            >
              ({item.value})
            </Typography>
          )}
        </Box>
      ))}
    </Box>
  );
};

