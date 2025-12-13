// Type declarations for custom theme extensions
// Özel tema uzantıları için tip bildirimleri

import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme {
    custom?: {
      elevation: {
        0: string;
        1: string;
        2: string;
        3: string;
        4: string;
        5: string;
      };
      gradients: {
        primary: string;
        secondary: string;
        success: string;
        warning: string;
        error: string;
        info: string;
        metricCard1: string;
        metricCard2: string;
        metricCard3: string;
        metricCard4: string;
        header: string;
        sidebar: string;
      };
      transitions: {
        duration: {
          shortest: number;
          shorter: number;
          short: number;
          standard: number;
          complex: number;
          enteringScreen: number;
          leavingScreen: number;
        };
        easing: {
          easeInOut: string;
          easeOut: string;
          easeIn: string;
          sharp: string;
        };
      };
      spacingScale: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
      };
    };
  }
}

