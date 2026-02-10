import React, { Suspense } from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';

import { useIsMobile } from '../utils/responsive';
import { LoadingState } from '../components/dashboard/LoadingState';
import { RefractionFilter } from '../components/ui/RefractionFilter';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { useEcoMode } from '../hooks/useEcoMode';

import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

export const Shell: React.FC = () => {
  const isMobile = useIsMobile();
  const { isEcoMode } = useEcoMode();

  const handleCreateConversation = () => {
    const event = new CustomEvent('create-conversation');
    window.dispatchEvent(event);
  };

  return (
    <Box
      className="gradient-shell"
      sx={{
        height: '100vh',
        display: isMobile ? 'flex' : 'grid',
        flexDirection: 'column',
        // Bento Grid Layout
        gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr',
        gridTemplateRows: 'auto 1fr',
        gap: isMobile ? 0 : 'var(--bento-gap)',
        padding: isMobile ? 0 : 'var(--bento-gap)',
        transition: 'background 300ms ease',
        overflow: 'hidden'
      }}
    >
      <RefractionFilter />

      {/* Header - Spans full width */}
      <Box sx={{ gridColumn: '1 / -1', zIndex: 10 }}>
         <TopBar />
      </Box>

      {/* Sidebar - Desktop */}
      {!isMobile && (
        <Box sx={{ height: '100%', overflow: 'hidden' }}>
          <SideNav onCreateConversation={handleCreateConversation} />
        </Box>
      )}

      {/* Mobile Drawer (SideNav handles its own visibility via state) */}
      {isMobile && <SideNav onCreateConversation={handleCreateConversation} />}

      {/* Main content area - Bento Cell */}
      <GlassPanel
        refractive={!isEcoMode && !isMobile}
        sx={{
          gridColumn: isMobile ? '1' : '2',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          // On mobile, reset glass effects for full screen
          borderRadius: isMobile ? 0 : 'var(--bento-radius)',
          border: isMobile ? 'none' : undefined,
          background: isMobile ? 'transparent' : undefined,
          backdropFilter: isMobile ? 'none' : undefined,
        }}
      >
        <Suspense fallback={<LoadingState fullWidth />}>
          <Outlet />
        </Suspense>
      </GlassPanel>
    </Box>
  );
};
