import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

// Custom tooltip for charts matching Material 3 style
// Material 3 stiline uygun grafikler için özel tooltip

export interface ChartTooltipProps {
  // Active state / Aktif durum
  active?: boolean;
  // Payload data / Yük verisi
  payload?: Array<{
    name: string;
    value: number | string;
    color: string;
    dataKey: string;
  }>;
  // Label (x-axis value) / Etiket (x ekseni değeri)
  label?: string | number;
  // Custom formatter function / Özel formatlayıcı fonksiyon
  formatter?: (value: any, name: string) => [string, string];
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  formatter,
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={4}
      sx={{
        p: 1.5,
        backgroundColor: 'background.paper',
        backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        minWidth: 120,
      }}
    >
      {label && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.primary',
            fontWeight: 600,
            mb: 1,
            display: 'block',
            fontSize: '0.75rem',
          }}
        >
          {String(label)}
        </Typography>
      )}
      <Box>
        {payload.map((item, index) => {
          const [formattedValue, formattedName] = formatter
            ? formatter(item.value, item.name)
            : [String(item.value), item.name];

          return (
            <Box
              key={index}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: index < payload.length - 1 ? 0.5 : 0,
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
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
                  flex: 1,
                }}
              >
                {formattedName}:
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.primary',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                }}
              >
                {formattedValue}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

