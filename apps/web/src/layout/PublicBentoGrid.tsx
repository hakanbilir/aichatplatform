import React from 'react';
import { Box, CardContent, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';

import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { useEcoMode } from '../hooks/useEcoMode';

interface PublicBentoGridProps {
  children: React.ReactNode;
  topRightElement?: React.ReactNode;
}

export const PublicBentoGrid: React.FC<PublicBentoGridProps> = ({ children, topRightElement }) => {
  const { isEcoMode } = useEcoMode();

  return (
    <Box
      className="gradient-shell"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        position: 'relative',
      }}
    >
      {topRightElement && (
        <Box position="absolute" top={16} right={16} zIndex={10}>
          {topRightElement}
        </Box>
      )}

      <BentoGrid sx={{ maxWidth: 1000, width: '100%' }}>
        {/* Main Content (Login/Signup Form) */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: { xs: 'span 1', md: 'span 2' },
            gridRow: { xs: 'span 1', md: 'span 2' },
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            p: 0, // Padding handled by children or inner container
          }}
        >
          {children}
        </GlassPanel>

        {/* Feature 1: Intelligence */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: 'span 1',
            minHeight: 200,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <AutoAwesomeIcon sx={{ fontSize: 40, mb: 2, color: 'primary.main' }} />
            <KineticTypography variant="h6">Agentic Intelligence</KineticTypography>
            <Typography variant="body2" color="text.secondary">
              Powered by next-gen models.
            </Typography>
          </CardContent>
        </GlassPanel>

        {/* Feature 2: Speed */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: 'span 1',
            minHeight: 200,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <CardContent sx={{ textAlign: 'center' }}>
            <SpeedIcon sx={{ fontSize: 40, mb: 2, color: 'secondary.main' }} />
            <KineticTypography variant="h6">Kinetic Speed</KineticTypography>
            <Typography variant="body2" color="text.secondary">
              Real-time streaming & interactions.
            </Typography>
          </CardContent>
        </GlassPanel>

        {/* Feature 3: Security */}
        <GlassPanel
          refractive={!isEcoMode}
          sx={{
            gridColumn: { xs: 'span 1', md: 'span 2' },
            display: { xs: 'none', md: 'flex' },
            minHeight: 150,
            alignItems: 'center',
          }}
        >
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ fontSize: 30, color: 'success.main' }} />
            <Box>
              <KineticTypography variant="h6">Enterprise Grade Security</KineticTypography>
              <Typography variant="body2" color="text.secondary">
                Your data is encrypted and protected.
              </Typography>
            </Box>
          </CardContent>
        </GlassPanel>
      </BentoGrid>
    </Box>
  );
};
