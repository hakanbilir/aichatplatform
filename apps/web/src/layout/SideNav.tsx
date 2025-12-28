import React, { useState } from 'react';
import { Box, Button, Typography, Drawer, IconButton, useTheme } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { OrgSwitcher } from './OrgSwitcher';
import { ConversationList } from '../chat/ConversationList';
import { useIsMobile } from '../utils/responsive';

interface SideNavProps {
  onCreateConversation: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({ onCreateConversation }) => {
  const { t } = useTranslation('chat');
  const { t: tCommon } = useTranslation('common');
  const theme = useTheme();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const sidebarContent = (
    <Box
      className="gradient-sidebar"
      sx={{
        width: { xs: 280, sm: 280 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 2,
        color: 'white',
        borderRight: '1px solid rgba(255,255,255,0.15)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <OrgSwitcher />
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        size="small"
        onClick={() => {
          onCreateConversation();
          if (isMobile) setMobileOpen(false);
        }}
        sx={{
          mb: 2,
          minHeight: 44,
          transition: 'all 200ms ease',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        }}
      >
        {t('conversation.new')}
      </Button>
      <Typography
        variant="caption"
        sx={{
          mb: 1,
          opacity: 0.8,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
        }}
      >
        {t('conversation.recent')}
      </Typography>
      <Box
        flex={1}
        overflow="auto"
        sx={{
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '3px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '3px',
            '&:hover': {
              background: 'rgba(255,255,255,0.3)',
            },
          },
        }}
      >
        <ConversationList />
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={handleDrawerToggle}
          aria-label={tCommon('openMenu')}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: theme.zIndex.drawer + 1,
            backgroundColor: 'background.paper',
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'background.paper',
              transform: 'scale(1.05)',
            },
            transition: 'transform 200ms ease',
          }}
        >
          <MenuIcon />
        </IconButton>
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better mobile performance / Daha iyi mobil performans
          }}
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              boxSizing: 'border-box',
              border: 'none',
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={handleDrawerToggle}
              aria-label={tCommon('closeMenu')}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 1,
                color: 'white',
                backgroundColor: 'rgba(0,0,0,0.2)',
                '&:hover': {
                  backgroundColor: 'rgba(0,0,0,0.3)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
            {sidebarContent}
          </Box>
        </Drawer>
      </>
    );
  }

  return sidebarContent;
};

