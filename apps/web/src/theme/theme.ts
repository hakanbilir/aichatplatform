import { createTheme } from '@mui/material/styles';

// Material 3–inspired color tokens with vivid gradients in CSS
// Material 3 ilhamlı renk token'ları, CSS'te canlı gradyanlarla
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C4DFF',
      light: '#9C75FF',
      dark: '#5C2EE6',
    },
    secondary: {
      main: '#00E5FF',
      light: '#33EBFF',
      dark: '#00B8CC',
    },
    success: {
      main: '#10B981',
      light: '#34D399',
      dark: '#059669',
    },
    warning: {
      main: '#F59E0B',
      light: '#FBBF24',
      dark: '#D97706',
    },
    error: {
      main: '#EF4444',
      light: '#F87171',
      dark: '#DC2626',
    },
    info: {
      main: '#3B82F6',
      light: '#60A5FA',
      dark: '#2563EB',
    },
    background: {
      default: '#050711',
      paper: '#101322',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#B0B3C3',
      disabled: '#6B7280',
    },
  },
  shape: {
    borderRadius: 16,
  },
  spacing: (factor: number) => `${0.25 * factor}rem`, // 4px base unit / 4px temel birim
  typography: {
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Roboto", sans-serif',
    h1: {
      fontSize: 'clamp(2rem, 5vw, 3rem)',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 'clamp(1.5rem, 3vw, 2rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: 'clamp(1.125rem, 2vw, 1.5rem)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 640,
      md: 768,
      lg: 1024,
      xl: 1280,
    },
  },
  // Custom theme extensions for Material 3 + Grafana style
  // Material 3 + Grafana stili için özel tema uzantıları
  custom: {
    // Elevation tokens (Material 3 style)
    // Yükseklik token'ları (Material 3 stili)
    elevation: {
      0: 'none',
      1: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
      2: '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
      3: '0 10px 20px rgba(0,0,0,0.19), 0 6px 6px rgba(0,0,0,0.23)',
      4: '0 15px 25px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)',
      5: '0 20px 40px rgba(0,0,0,0.3), 0 15px 12px rgba(0,0,0,0.22)',
    },
    // Gradient definitions
    // Gradyan tanımları
    gradients: {
      primary: 'linear-gradient(135deg, #7C4DFF 0%, #00E5FF 100%)',
      secondary: 'linear-gradient(135deg, #00E5FF 0%, #FF4081 100%)',
      success: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      warning: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      error: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
      info: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
      metricCard1: 'linear-gradient(135deg, rgba(59,130,246,0.18), rgba(56,189,248,0.16))',
      metricCard2: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(45,212,191,0.18))',
      metricCard3: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(236,72,153,0.18))',
      metricCard4: 'linear-gradient(135deg, rgba(124,77,255,0.18), rgba(0,229,255,0.16))',
      header: 'linear-gradient(90deg, rgba(124,77,255,0.9), rgba(0,229,255,0.8))',
      sidebar: 'linear-gradient(180deg, rgba(124,77,255,0.8), rgba(0,229,255,0.4))',
    },
    // Animation/transition tokens
    // Animasyon/geçiş token'ları
    transitions: {
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    // Spacing scale (Material 3)
    // Boşluk ölçeği (Material 3)
    spacingScale: {
      xs: '0.25rem', // 4px
      sm: '0.5rem', // 8px
      md: '1rem', // 16px
      lg: '1.5rem', // 24px
      xl: '2rem', // 32px
      xxl: '3rem', // 48px
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 999,
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
          },
          '&:active': {
            transform: 'translateY(0)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 15px 12px rgba(0,0,0,0.22)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.08)',
        },
      },
    },
  },
} as any); // Type assertion for custom theme extensions / Özel tema uzantıları için tip onayı

