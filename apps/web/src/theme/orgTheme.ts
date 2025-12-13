// apps/web/src/theme/orgTheme.ts

import { createTheme, Theme } from '@mui/material/styles';
import { OrgBrandingConfigDto } from '../api/orgBranding';

export function createOrgTheme(branding: OrgBrandingConfigDto | null): Theme {
  const primaryColor = branding?.primaryColor || '#0F766E';
  const secondaryColor = branding?.secondaryColor || '#14B8A6';

  return createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: primaryColor
      },
      secondary: {
        main: secondaryColor
      }
    },
    typography: {
      fontFamily: branding?.fontFamily || undefined
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundImage: branding?.backgroundGradient || undefined
          }
        }
      }
    }
  });
}
