import React from 'react';
import { Box, Card, CardContent, Typography, Tooltip, useTheme } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';

// Metric card component with gradient background, icon, value, label, trend indicator, and micro-animations
// Gradyan arka plan, ikon, değer, etiket, trend göstergesi ve mikro animasyonlarla metrik kartı bileşeni

export interface MetricCardProps {
  // Main value to display / Görüntülenecek ana değer
  value: string | number;
  // Label/description / Etiket/açıklama
  label: string;
  // Optional icon element / İsteğe bağlı ikon elementi
  icon?: React.ReactNode;
  // Optional trend indicator (positive/negative/neutral) / İsteğe bağlı trend göstergesi (pozitif/negatif/nötr)
  trend?: {
    value: number;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
  };
  // Optional tooltip / İsteğe bağlı tooltip
  tooltip?: string;
  // Gradient variant (1-6) / Gradyan varyantı (1-6)
  gradientVariant?: 1 | 2 | 3 | 4 | 5 | 6;
  // Custom background gradient / Özel arka plan gradyanı
  customGradient?: string;
  // Optional secondary value / İsteğe bağlı ikincil değer
  secondaryValue?: string;
  // Optional click handler / İsteğe bağlı tıklama işleyicisi
  onClick?: () => void;
  // Custom sx props / Özel sx prop'ları
  sx?: SxProps<Theme>;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  value,
  label,
  icon,
  trend,
  tooltip,
  gradientVariant = 1,
  customGradient,
  secondaryValue,
  onClick,
  sx,
}) => {
  const theme = useTheme();
  const isClickable = !!onClick;

  // Get gradient class or custom gradient / Gradyan sınıfını veya özel gradyanı al
  const gradientClass = customGradient
    ? undefined
    : `gradient-metric-${gradientVariant}`;
  const gradientStyle = customGradient
    ? { background: customGradient }
    : undefined;

  // Get trend color / Trend rengini al
  const getTrendColor = () => {
    if (!trend) return 'text.secondary';
    if (trend.direction === 'up') return 'success.main';
    if (trend.direction === 'down') return 'error.main';
    return 'text.secondary';
  };

  // Format trend value / Trend değerini formatla
  const formatTrend = () => {
    if (!trend) return null;
    const sign = trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : '';
    return `${sign}${Math.abs(trend.value)}%`;
  };

  const cardContent = (
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': isClickable
          ? {
              transform: 'translateY(-4px)',
              boxShadow: (theme as any).custom?.elevation?.[4] || '0 20px 40px rgba(0,0,0,0.3)',
            }
          : {},
        ...sx,
      }}
      onClick={onClick}
      className={gradientClass}
      style={gradientStyle}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        {/* Header with icon and label / İkon ve etiketle başlık */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1.5}>
          <Box flex={1} minWidth={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: '0.75rem',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              {label}
            </Typography>
          </Box>
          {icon && (
            <Box
              sx={{
                opacity: 0.8,
                transition: 'opacity 200ms ease',
                '&:hover': { opacity: 1 },
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {/* Main value / Ana değer */}
        <Box mb={secondaryValue || trend ? 1 : 0}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
              lineHeight: 1.2,
              color: 'text.primary',
              className: 'metric-value-update',
            }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
        </Box>

        {/* Secondary value or trend / İkincil değer veya trend */}
        {(secondaryValue || trend) && (
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            {secondaryValue && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                {secondaryValue}
              </Typography>
            )}
            {trend && (
              <Box
                display="flex"
                alignItems="center"
                gap={0.5}
                sx={{
                  color: getTrendColor(),
                  fontSize: '0.75rem',
                  fontWeight: 600,
                }}
              >
                <Typography variant="caption" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>
                  {formatTrend()}
                </Typography>
                {trend.label && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {trend.label}
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Wrap in tooltip if provided / Sağlanmışsa tooltip ile sar
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        {cardContent}
      </Tooltip>
    );
  }

  return cardContent;
};

