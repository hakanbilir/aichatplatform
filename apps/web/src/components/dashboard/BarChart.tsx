import React from 'react';
import { Box, useTheme } from '@mui/material';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { ChartTooltip } from './utils/ChartTooltip';

// Bar chart component with Material 3 styling (horizontal or vertical)
// Material 3 stillendirmesiyle çubuk grafik bileşeni (yatay veya dikey)

export interface BarChartDataPoint {
  // Label for x-axis / X ekseni için etiket
  name: string;
  // Value(s) for bars / Çubuklar için değer(ler)
  [key: string]: string | number;
}

export interface BarChartProps {
  // Data array / Veri dizisi
  data: BarChartDataPoint[];
  // Data keys to plot as bars / Çubuklar olarak çizilecek veri anahtarları
  dataKeys: string[];
  // Colors for each data key / Her veri anahtarı için renkler
  colors?: string[];
  // Chart height / Grafik yüksekliği
  height?: number;
  // Horizontal bars / Yatay çubuklar
  horizontal?: boolean;
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

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKeys,
  colors,
  height = 300,
  horizontal = false,
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
        <RechartsBarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
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
            type={horizontal ? 'number' : 'category'}
            dataKey={horizontal ? undefined : 'name'}
            stroke={theme.palette.text.secondary}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: horizontal ? 'insideTop' : 'insideBottom',
                    offset: horizontal ? 0 : -5,
                    fill: theme.palette.text.secondary,
                    fontSize: 12,
                  }
                : undefined
            }
            tickFormatter={formatXAxis}
          />
          <YAxis
            type={horizontal ? 'category' : 'number'}
            dataKey={horizontal ? 'name' : undefined}
            stroke={theme.palette.text.secondary}
            tick={{ fill: theme.palette.text.secondary, fontSize: 12 }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: horizontal ? 0 : -90,
                    position: horizontal ? 'insideLeft' : 'insideLeft',
                    fill: theme.palette.text.secondary,
                    fontSize: 12,
                  }
                : undefined
            }
            tickFormatter={formatYAxis}
          />
          <Tooltip
            content={<ChartTooltip formatter={tooltipFormatter} />}
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span style={{ color: theme.palette.text.secondary, fontSize: '12px' }}>
                  {value}
                </span>
              )}
            />
          )}
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={chartColors[index % chartColors.length]}
              radius={[4, 4, 0, 0]}
              animationDuration={animationDuration}
              animationBegin={index * 100}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </Box>
  );
};

