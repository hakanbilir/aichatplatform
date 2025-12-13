import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme/theme';
import { createOrgTheme } from './theme/orgTheme';
import { AuthProvider } from './auth/AuthContext';
import { AppRouter } from './router';
import { useOrgBranding } from './hooks/useOrgBranding';
import { useFavicon } from './hooks/useFavicon';
import './styles/gradients.css';
import './styles/animations.css';

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
    <AuthProvider>
      <AppShell>
        <AppRouter />
      </AppShell>
    </AuthProvider>
  );
};

