import React, { useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { theme } from './theme/theme';
import { createOrgTheme } from './theme/orgTheme';
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './router';
import { useOrgBranding } from './hooks/useOrgBranding';
import { useFavicon } from './hooks/useFavicon';
import { EcoModeProvider, useEcoMode } from './hooks/useEcoMode';
import './styles/gradients.css';
import './styles/animations.css';
import './theme2026.css';

const queryClient = new QueryClient();

// Controller for global kinetic effects (tracking mouse)
const KineticController: React.FC = () => {
  const { isEcoMode } = useEcoMode();

  useEffect(() => {
    // If eco mode is on, we might want to stop tracking to save CPU
    if (isEcoMode) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Update CSS variables for specularity and refraction
      document.body.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.body.style.setProperty('--mouse-y', `${e.clientY}px`);

      // Handle specular buttons local coordinates
      const target = e.target as HTMLElement;
      const btn = target.closest('.specular-button') as HTMLElement;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--local-x', `${e.clientX - rect.left}px`);
        btn.style.setProperty('--local-y', `${e.clientY - rect.top}px`);
      }
    };

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = Math.min(scrollY / (docHeight || 1), 1);

      // Update scroll-based variables
      document.body.style.setProperty('--scroll-y', `${scrollY}`);
      document.body.style.setProperty('--scroll-progress', `${scrollProgress}`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isEcoMode]);

  return null;
};

// AppShell component that provides dynamic org theme (47.md)
// Dinamik org teması sağlayan AppShell bileşeni (47.md)
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { branding } = useOrgBranding();
  const orgTheme = React.useMemo(() => createOrgTheme(branding), [branding]);
  const effectiveTheme = branding ? orgTheme : theme;

  // Update favicon dynamically (47.md)
  // Favicon'u dinamik olarak güncelle (47.md)
  useFavicon(branding?.faviconUrl);

  return (
    <ThemeProvider theme={effectiveTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EcoModeProvider>
          <KineticController />
          <AppShell>
            <AppRouter />
          </AppShell>
        </EcoModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
