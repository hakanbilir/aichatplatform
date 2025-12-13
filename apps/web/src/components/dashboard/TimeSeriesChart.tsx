import React from 'react';
import { Box, useTheme } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartTooltip } from './utils/ChartTooltip';

// Time-series chart component with Grafana-style Material 3 styling
// Grafana stili Material 3 stillendirmesiyle zaman serisi grafik bileşeni

export interface TimeSeriesDataPoint {
  // Timestamp or label for x-axis / X ekseni için zaman damgası veya etiket
  timestamp: string | number;
  // Value(s) for y-axis / Y ekseni için değer(ler)
  [key: string]: string | number;
}

export interface TimeSeriesChartProps {
  // Data array / Veri dizisi
  data: TimeSeriesDataPoint[];
  // Data keys to plot as lines / Çizgiler olarak çizilecek veri anahtarları
  dataKeys: string[];
  // Colors for each data key / Her veri anahtarı için renkler
  colors?: string[];
  // Chart height / Grafik yüksekliği
  height?: number;
  // Show grid / Izgara göster
  showGrid?: boolean;
  // Show legend / Gösterge göster
  showLegend?: boolean;
  // X-axis label / X ekseni etiketi
  xAxisLabel?: string;
  // Y-axis label / Y ekseni etiketi
  yAxisLabel?: string;
  // Format function for x-axis values / X ekseni değerleri için format fonksiyonu
  formatXAxis?: (value: any) => string;
  // Format function for y-axis values / Y ekseni değerleri için format fonksiyonu
  formatYAxis?: (value: any) => string;
  // Custom tooltip formatter / Özel tooltip formatlayıcı
  tooltipFormatter?: (value: any, name: string) => [string, string];
  // Animation duration (ms) / Animasyon süresi (ms)
  animationDuration?: number;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  dataKeys,
  colors,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  formatXAxis,
  formatYAxis,
  tooltipFormatter,
  animationDuration = 1000,
}) => {
  const theme = useTheme();

  // Default colors from theme / Temadan varsayılan renkler
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ];

  const chartColors = colors || defaultColors;

  return (
    <Box
      sx={{
        width: '100%',
        height,
        position: 'relative',
        className: 'data-slide-up',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={theme.palette.divider || 'rgba(255,255,255,0.1)'}
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey="timestamp"
            stroke={theme.palette.text.secondary}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: 'insideBottom',
                    offset: -5,
                    fill: theme.palette.text.secondary,
                    fontSize: 12,
                  }
                : undefined
            }
            tickFormatter={formatXAxis}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    fill: theme.palette.text.secondary,
                    fontSize: 12,
                  }
                : undefined
            }
            tickFormatter={formatYAxis}
          />
          <Tooltip
            content={<ChartTooltip formatter={tooltipFormatter} />}
            cursor={{ stroke: theme.palette.primary.main, strokeWidth: 1, strokeDasharray: '5 5' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => (
                <span style={{ color: theme.palette.text.secondary, fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />
          )}
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={chartColors[index % chartColors.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: chartColors[index % chartColors.length] }}
              activeDot={{ r: 5 }}
              animationDuration={animationDuration}
              animationBegin={index * 100}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

