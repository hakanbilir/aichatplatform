import React from 'react';
import { Box } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { SideNav } from './SideNav';
import { useIsMobile } from '../utils/responsive';

export const Shell: React.FC = () => {
  const isMobile = useIsMobile();

  const handleCreateConversation = () => {
    const event = new CustomEvent('create-conversation');
    window.dispatchEvent(event);
  };

  return (
    <Box
      className="gradient-shell"
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        transition: 'background 300ms ease',
      }}
    >
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

