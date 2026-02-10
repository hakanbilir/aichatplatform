import React, { useState } from 'react';
import { Box, Drawer, IconButton, useTheme, List, ListItemButton, ListItemIcon, ListItemText, Collapse } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import InboxIcon from '@mui/icons-material/Inbox';
import SchoolIcon from '@mui/icons-material/School';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

import { OrgSwitcher } from './OrgSwitcher';
import { ConversationList } from '../chat/ConversationList';
import { useIsMobile } from '../utils/responsive';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { useEcoMode } from '../hooks/useEcoMode';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface SideNavProps {
  onCreateConversation: () => void;
}

export const SideNav: React.FC<SideNavProps> = ({ onCreateConversation }) => {
  const { t } = useTranslation(['chat', 'common', 'inbox', 'knowledge', 'org']);
  const theme = useTheme();
  const isMobile = useIsMobile();
  const { isEcoMode } = useEcoMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeOrg } = useAuth();

  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigate = (path: string) => {
    if (activeOrg) {
      navigate(`/app/orgs/${activeOrg.id}${path}`);
      if (isMobile) setMobileOpen(false);
    }
  };

  const NavItem = ({ icon, label, path, onClick, ...props }: { icon: React.ReactNode, label: string, path?: string, onClick?: () => void } & any) => {
    const isActive = path ? location.pathname.includes(path) : false;
    return (
      <ListItemButton
        {...props}
        onClick={() => {
          if (onClick) onClick();
          else if (path) handleNavigate(path);
        }}
        selected={isActive}
        sx={{
          borderRadius: 1.5,
          mb: 0.5,
          py: 0.8,
          '&.Mui-selected': {
            background: 'rgba(255,255,255,0.1)',
            '&:hover': {
              background: 'rgba(255,255,255,0.15)',
            },
          },
          '&:hover': {
            background: 'rgba(255,255,255,0.05)',
          },
        }}
      >
        <ListItemIcon sx={{ minWidth: 36, color: isActive ? 'white' : 'rgba(255,255,255,0.7)' }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            variant: 'body2',
            fontWeight: isActive ? 600 : 400,
            color: isActive ? 'white' : 'rgba(255,255,255,0.9)'
          }}
        />
      </ListItemButton>
    );
  };

  const sidebarContent = (
    <GlassPanel
      refractive={!isEcoMode}
      sx={{
        width: { xs: 280, sm: 280 },
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 2,
        color: 'white',
        borderRight: '1px solid rgba(255,255,255,0.15)',
        transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        borderRadius: isMobile ? 0 : 'var(--bento-radius)',
      }}
    >
      <OrgSwitcher />

      <List dense sx={{ mb: 1 }}>
        <NavItem
          icon={<InboxIcon fontSize="small" />}
          label={t('inbox:title', 'Inbox')}
          path="/inbox"
          data-testid="sidenav-inbox"
        />
        <NavItem
          icon={<SchoolIcon fontSize="small" />}
          label={t('knowledge:title', 'Knowledge Base')}
          path="/knowledge"
          data-testid="sidenav-knowledge"
        />
        <NavItem
          icon={<BarChartIcon fontSize="small" />}
          label={t('common:analytics', 'Analytics')}
          path="/analytics"
          data-testid="sidenav-analytics"
        />

        <ListItemButton
          onClick={() => setSettingsOpen(!settingsOpen)}
          data-testid="sidenav-settings"
          sx={{
            borderRadius: 1.5,
            mb: 0.5,
            py: 0.8,
            '&:hover': { background: 'rgba(255,255,255,0.05)' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'rgba(255,255,255,0.7)' }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={t('common:settings', 'Settings')}
            primaryTypographyProps={{ variant: 'body2', color: 'rgba(255,255,255,0.9)' }}
          />
          {settingsOpen ? <ExpandLess sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <ExpandMore sx={{ color: 'rgba(255,255,255,0.5)' }} />}
        </ListItemButton>

        <Collapse in={settingsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ pl: 2 }}>
            <NavItem
              icon={<PeopleIcon fontSize="small" />}
              label={t('org:members.title', 'Members')}
              path="/settings/members"
              data-testid="sidenav-members"
            />
            <NavItem
              icon={<CreditCardIcon fontSize="small" />}
              label={t('org:billing.title', 'Billing')}
              path="/billing"
              data-testid="sidenav-billing"
            />
          </List>
        </Collapse>
      </List>

      <SpecularButton
        variant="contained"
        startIcon={<AddIcon />}
        size="small"
        onClick={() => {
          onCreateConversation();
          if (isMobile) setMobileOpen(false);
        }}
        data-ai-action="create-conversation"
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
      </SpecularButton>
      <KineticTypography
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
      </KineticTypography>
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
    </GlassPanel>
  );

  if (isMobile) {
    return (
      <>
        <IconButton
          onClick={handleDrawerToggle}
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
