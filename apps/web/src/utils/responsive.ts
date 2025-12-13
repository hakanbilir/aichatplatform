// Responsive utility functions for breakpoint helpers and responsive value generators
// Kırılma noktası yardımcıları ve duyarlı değer üreticileri için duyarlı yardımcı fonksiyonlar

import { useTheme, useMediaQuery, Breakpoint } from '@mui/material';

// Breakpoint values matching Material-UI theme
// Material-UI temasıyla eşleşen kırılma noktası değerleri
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  xxl: 1536,
} as const;

// Hook to check if current viewport matches a breakpoint
// Mevcut görünüm alanının bir kırılma noktasıyla eşleşip eşleşmediğini kontrol etmek için hook
export const useBreakpoint = (breakpoint: Breakpoint | 'xxl') => {
  const theme = useTheme();
  
  if (breakpoint === 'xxl') {
    return useMediaQuery(`(min-width:${breakpoints.xxl}px)`);
  }
  
  return useMediaQuery(theme.breakpoints.up(breakpoint));
};

// Hook to check if current viewport is below a breakpoint
// Mevcut görünüm alanının bir kırılma noktasının altında olup olmadığını kontrol etmek için hook
export const useBreakpointDown = (breakpoint: Breakpoint | 'xxl') => {
  const theme = useTheme();
  
  if (breakpoint === 'xxl') {
    return useMediaQuery(`(max-width:${breakpoints.xxl - 1}px)`);
  }
  
  return useMediaQuery(theme.breakpoints.down(breakpoint));
};

// Hook to check if current viewport is between two breakpoints
// Mevcut görünüm alanının iki kırılma noktası arasında olup olmadığını kontrol etmek için hook
export const useBreakpointBetween = (
  start: Breakpoint | 'xxl',
  end: Breakpoint | 'xxl'
) => {
  const theme = useTheme();
  const startValue = start === 'xxl' ? breakpoints.xxl : theme.breakpoints.values[start];
  const endValue = end === 'xxl' ? breakpoints.xxl : theme.breakpoints.values[end];
  
  return useMediaQuery(`(min-width:${startValue}px) and (max-width:${endValue - 1}px)`);
};

// Hook to check if current viewport is mobile
// Mevcut görünüm alanının mobil olup olmadığını kontrol etmek için hook
export const useIsMobile = () => {
  return useBreakpointDown('md');
};

// Hook to check if current viewport is tablet
// Mevcut görünüm alanının tablet olup olmadığını kontrol etmek için hook
export const useIsTablet = () => {
  return useBreakpointBetween('md', 'lg');
};

// Hook to check if current viewport is desktop
// Mevcut görünüm alanının masaüstü olup olmadığını kontrol etmek için hook
export const useIsDesktop = () => {
  return useBreakpoint('lg');
};

// Generate responsive value using clamp() CSS function
// clamp() CSS fonksiyonunu kullanarak duyarlı değer oluştur
export const responsiveValue = (
  min: number | string,
  preferred: number | string,
  max: number | string
): string => {
  const minValue = typeof min === 'number' ? `${min}px` : min;
  const preferredValue = typeof preferred === 'number' ? `${preferred}px` : preferred;
  const maxValue = typeof max === 'number' ? `${max}px` : max;
  
  return `clamp(${minValue}, ${preferredValue}, ${maxValue})`;
};

// Generate responsive font size
// Duyarlı font boyutu oluştur
export const responsiveFontSize = (
  min: number,
  preferred: number | string,
  max: number
): string => {
  const preferredValue = typeof preferred === 'number' 
    ? `${preferred}px` 
    : preferred;
  
  return responsiveValue(min, preferredValue, max);
};

// Generate responsive spacing
// Duyarlı boşluk oluştur
export const responsiveSpacing = (
  min: number,
  preferred: number | string,
  max: number
): string => {
  return responsiveValue(min, preferred, max);
};

// Get responsive column count based on breakpoint
// Kırılma noktasına göre duyarlı sütun sayısını al
export const getResponsiveColumns = (
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl',
  columns: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  }
): number => {
  switch (breakpoint) {
    case 'xs':
      return columns.xs || 1;
    case 'sm':
      return columns.sm || columns.xs || 2;
    case 'md':
      return columns.md || columns.sm || columns.xs || 2;
    case 'lg':
      return columns.lg || columns.md || columns.sm || columns.xs || 3;
    case 'xl':
      return columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 4;
    case 'xxl':
      return columns.xxl || columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 4;
    default:
      return 1;
  }
};

// Generate responsive grid template columns
// Duyarlı ızgara şablon sütunları oluştur
export const responsiveGridColumns = (
  columns: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    xxl?: number;
  }
): Record<string, string> => {
  return {
    xs: `repeat(${columns.xs || 1}, 1fr)`,
    sm: `repeat(${columns.sm || columns.xs || 2}, 1fr)`,
    md: `repeat(${columns.md || columns.sm || columns.xs || 2}, 1fr)`,
    lg: `repeat(${columns.lg || columns.md || columns.sm || columns.xs || 3}, 1fr)`,
    xl: `repeat(${columns.xl || columns.lg || columns.md || columns.sm || columns.xs || 4}, 1fr)`,
  };
};

