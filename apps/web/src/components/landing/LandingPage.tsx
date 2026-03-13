import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';

import { BentoGrid } from '../ui/kinetic/BentoGrid';
import { GlassPanel } from '../ui/kinetic/GlassPanel';
import { KineticTypography } from '../ui/kinetic/KineticTypography';
import { SpecularButton } from '../ui/kinetic/SpecularButton';
import { useEcoMode } from '../../hooks/useEcoMode';
import { RefractionFilter } from '../ui/RefractionFilter';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isEcoMode } = useEcoMode();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        // Dynamic background or gradient can be added here
        background: 'radial-gradient(circle at 50% 50%, #1a1c2e 0%, #050711 100%)',
      }}
    >
      <RefractionFilter />

      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box mb={6} textAlign="center">
          <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
            <AutoAwesomeIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <KineticTypography variant="h2" component="h1" fontWeight="bold">
              Kinetic Refraction
            </KineticTypography>
          </Box>
          <KineticTypography variant="h5" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            The next generation of AI agent interaction, designed for speed, clarity, and depth.
          </KineticTypography>
        </Box>

        <BentoGrid>
          {/* Hero / CTA Tile - Large Priority */}
          <GlassPanel
            refractive={!isEcoMode}
            sx={{
              gridColumn: { xs: 'span 1', md: 'span 2' },
              gridRow: { xs: 'span 1', md: 'span 2' },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              p: 6,
              minHeight: 400,
              textAlign: 'center',
            }}
          >
            <KineticTypography variant="h3" gutterBottom>
              Experience the Future
            </KineticTypography>
            <Typography variant="body1" sx={{ mb: 4, opacity: 0.8, maxWidth: 400 }}>
              Agentic workflows powered by Node.js 24+ and server-sent events. Seamless, refractive,
              and responsive.
            </Typography>
            <Box display="flex" gap={2}>
              <SpecularButton
                variant="contained"
                size="large"
                onClick={() => navigate('/auth/signup')}
                aiAction="signup"
              >
                Get Started
              </SpecularButton>
              <SpecularButton
                variant="outlined"
                size="large"
                onClick={() => navigate('/auth/login')}
                aiAction="login"
                sx={{ borderColor: 'rgba(255,255,255,0.2)' }}
              >
                Login
              </SpecularButton>
            </Box>
          </GlassPanel>

          {/* Feature 1: Performance */}
          <GlassPanel refractive={!isEcoMode} sx={{ p: 3, minHeight: 200 }}>
            <Box display="flex" flexDirection="column" height="100%" justifyContent="space-between">
              <Box>
                <SpeedIcon color="secondary" fontSize="large" sx={{ mb: 2 }} />
                <KineticTypography variant="h5" gutterBottom>
                  Blazing Fast
                </KineticTypography>
                <Typography variant="body2" color="text.secondary">
                  Optimized for Node.js 24+ with worker threads and streaming responses.
                </Typography>
              </Box>
            </Box>
          </GlassPanel>

          {/* Feature 2: Security */}
          <GlassPanel refractive={!isEcoMode} sx={{ p: 3, minHeight: 200 }}>
            <Box display="flex" flexDirection="column" height="100%" justifyContent="space-between">
              <Box>
                <SecurityIcon color="success" fontSize="large" sx={{ mb: 2 }} />
                <KineticTypography variant="h5" gutterBottom>
                  Enterprise Secure
                </KineticTypography>
                <Typography variant="body2" color="text.secondary">
                  Role-based access, audit logs, and secure glass-morphism UI.
                </Typography>
              </Box>
            </Box>
          </GlassPanel>

          {/* Feature 3: Collaboration */}
          <GlassPanel
            refractive={!isEcoMode}
            sx={{
              gridColumn: { xs: 'span 1', md: 'span 2' },
              p: 3,
              minHeight: 180,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box display="flex" gap={4} alignItems="center" width="100%">
              <GroupIcon color="info" sx={{ fontSize: 60 }} />
              <Box>
                <KineticTypography variant="h4" gutterBottom>
                  Collaborative Intelligence
                </KineticTypography>
                <Typography variant="body1" color="text.secondary">
                  Share conversations, manage organizations, and work together with context-aware AI
                  agents.
                </Typography>
              </Box>
            </Box>
          </GlassPanel>
        </BentoGrid>
      </Container>
    </Box>
  );
};
