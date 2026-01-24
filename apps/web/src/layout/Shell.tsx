import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { SideNav } from './SideNav';
import { useIsMobile } from '../utils/responsive';
import { useEcoMode } from '../components/EcoModeContext';

export const Shell: React.FC = () => {
  const isMobile = useIsMobile();
  const { isEcoMode } = useEcoMode();

  const handleCreateConversation = () => {
    const event = new CustomEvent('create-conversation');
    window.dispatchEvent(event);
  };

  return (
    <Box
      className={`gradient-shell ${!isEcoMode ? 'glass-shell' : ''}`}
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 300ms ease',
      }}
    >
      {!isEcoMode && (
        <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
          <defs>
            <filter id="refraction">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" result="ripple" />
              <feDisplacementMap in="SourceGraphic" in2="ripple" scale="5" />
            </filter>
          </defs>
        </svg>
      )}
      <TopBar />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Sidebar - hidden on mobile, shown via drawer / Sidebar - mobilde gizli, drawer ile gösterilir */}
        {!isMobile && (
          <Box
            sx={{
              flexShrink: 0,
              transition: 'width 300ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <SideNav onCreateConversation={handleCreateConversation} />
          </Box>
        )}
        {isMobile && <SideNav onCreateConversation={handleCreateConversation} />}
        
        {/* Main content area / Ana içerik alanı */}
        <Box
          flex={1}
          display="flex"
          flexDirection="column"
          sx={{
            minWidth: 0,
            overflow: 'hidden',
            transition: 'margin 300ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

