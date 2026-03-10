import React, { useState } from 'react';
import { Box, Drawer, IconButton, useTheme, Divider } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/Add';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import InboxIcon from '@mui/icons-material/Inbox';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SettingsIcon from '@mui/icons-material/Settings';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import PeopleIcon from '@mui/icons-material/People';
import TerminalIcon from '@mui/icons-material/Terminal';
import ChatIcon from '@mui/icons-material/Chat';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import ScienceIcon from '@mui/icons-material/Science';
import DescriptionIcon from '@mui/icons-material/Description';
import BadgeIcon from '@mui/icons-material/Badge';

import { ConversationList } from '../chat/ConversationList';
import { useIsMobile } from '../utils/responsive';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { useEcoMode } from '../hooks/useEcoMode';

import { OrgSwitcher } from './OrgSwitcher';

interface SideNavProps {
  onCreateConversation: () => void;
}

const NavItem = ({
  to,
  icon,
  label,
  onClick,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    style={({ isActive }) => ({
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderRadius: '8px',
      color: isActive ? 'white' : 'rgba(255,255,255,0.7)',
      backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
      textDecoration: 'none',
      fontSize: '0.85rem',
      fontWeight: 500,
      transition: 'all 0.2s ease',
      marginBottom: '2px',
    })}
    className="nav-item"
  >
    <Box
      component="span"
      sx={{ display: 'flex', mr: 1.5, opacity: 0.9, '& > svg': { fontSize: 18 } }}
    >
      {icon}
    </Box>
    {label}
  </NavLink>
);

export const SideNav: React.FC<SideNavProps> = ({
  onCreateConversation: _onCreateConversation,
}) => {
  const { t } = useTranslation(['chat', 'common']);
  const theme = useTheme();
  const isMobile = useIsMobile();
  const { isEcoMode } = useEcoMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = () => {
    if (isMobile) setMobileOpen(false);
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

      <SpecularButton
        variant="contained"
        startIcon={<AddIcon />}
        size="small"
        onClick={() => {
          if (orgId) {
            navigate(`/app/orgs/${orgId}/chat`);
          } else {
            navigate('/app/chat');
          }
          if (isMobile) setMobileOpen(false);
        }}
        data-ai-action="create-conversation"
        sx={{
          mb: 2,
          minHeight: 40,
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
        {t('conversation.new', { ns: 'chat' })}
      </SpecularButton>

      {orgId && (
        <Box mb={2} display="flex" flexDirection="column">
          <NavItem
            to={`/app/orgs/${orgId}/chat`}
            icon={<ChatIcon />}
            label={t('nav.chat', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/inbox`}
            icon={<InboxIcon />}
            label={t('nav.inbox', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/knowledge`}
            icon={<AutoStoriesIcon />}
            label={t('nav.knowledge', { ns: 'common' })}
            onClick={handleNavClick}
          />

          <Box mt={1} mb={0.5}>
            <KineticTypography
              variant="caption"
              sx={{
                opacity: 0.5,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                px: 1.5,
              }}
            >
              {t('nav.tools', { ns: 'common' })}
            </KineticTypography>
          </Box>

          <NavItem
            to={`/app/orgs/${orgId}/playground`}
            icon={<TerminalIcon />}
            label={t('nav.playground', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/experiments`}
            icon={<ScienceIcon />}
            label={t('nav.experiments', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/prompt-templates`}
            icon={<DescriptionIcon />}
            label={t('nav.prompts', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/chat-profiles`}
            icon={<BadgeIcon />}
            label={t('nav.profiles', { ns: 'common' })}
            onClick={handleNavClick}
          />

          <Box mt={1} mb={0.5}>
            <KineticTypography
              variant="caption"
              sx={{
                opacity: 0.5,
                fontSize: '0.65rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontWeight: 600,
                px: 1.5,
              }}
            >
              {t('nav.admin', { ns: 'common' })}
            </KineticTypography>
          </Box>

          <NavItem
            to={`/app/orgs/${orgId}/analytics`}
            icon={<QueryStatsIcon />}
            label={t('nav.analytics', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/usage`}
            icon={<CreditCardIcon />}
            label={t('nav.usage', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/settings/members`}
            icon={<PeopleIcon />}
            label={t('nav.members', { ns: 'common' })}
            onClick={handleNavClick}
          />
          <NavItem
            to={`/app/orgs/${orgId}/settings/branding`}
            icon={<SettingsIcon />}
            label={t('nav.settings', { ns: 'common' })}
            onClick={handleNavClick}
          />
        </Box>
      )}

      <Divider sx={{ mb: 1, borderColor: 'rgba(255,255,255,0.1)' }} />

      <KineticTypography
        variant="caption"
        sx={{
          mb: 1,
          opacity: 0.8,
          fontSize: '0.7rem',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: 600,
          px: 0.5,
        }}
      >
        {t('conversation.recent', { ns: 'chat' })}
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
          data-ai-action="drawertoggle"
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
              bgcolor: 'transparent',
            },
          }}
        >
          <Box sx={{ position: 'relative', height: '100%' }}>
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
              data-ai-action="drawertoggle"
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
