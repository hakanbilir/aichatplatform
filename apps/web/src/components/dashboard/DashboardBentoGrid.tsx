import React from 'react';
import {
  Box,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Skeleton,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import ArticleIcon from '@mui/icons-material/Article';
import { useNavigate, useParams } from 'react-router-dom';

import { BentoGrid } from '../ui/kinetic/BentoGrid';
import { GlassPanel } from '../ui/kinetic/GlassPanel';
import { KineticTypography } from '../ui/kinetic/KineticTypography';
import { SpecularButton } from '../ui/kinetic/SpecularButton';
import { useEcoMode } from '../../hooks/useEcoMode';
import { useRecentConversations } from '../../hooks/useRecentConversations';
import { usePromptTemplates } from '../../hooks/usePromptTemplates';

const DashboardBentoGridComponent: React.FC = () => {
  const { t } = useTranslation('chat');
  const { isEcoMode } = useEcoMode();
  const navigate = useNavigate();
  const { orgId } = useParams<{ orgId: string }>();

  const { data: recentConversations, isLoading: loadingRecent } = useRecentConversations(orgId);
  // Only fetch templates if we are in an organization context
  const { data: templates, isLoading: loadingTemplates } = usePromptTemplates(orgId || '');

  const handleNewChat = () => {
    if (orgId) {
      navigate(`/app/orgs/${orgId}/chat`);
    } else {
      navigate('/app/chat');
    }
  };

  const handleSelectConversation = (id: string) => {
    if (orgId) {
      navigate(`/app/orgs/${orgId}/chat/${id}`);
    } else {
      navigate(`/app/chat/${id}`);
    }
  };

  return (
    <BentoGrid sx={{ p: 4, height: '100%', overflow: 'auto' }}>
      {/* Priority: New Chat (Large Tile) */}
      <GlassPanel
        refractive={!isEcoMode}
        sx={{
          gridColumn: 'span 2',
          gridRow: 'span 2',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: 4,
          minHeight: 300,
          cursor: 'pointer',
          transition: 'transform 0.2s',
          '&:hover': { transform: 'scale(1.01)' },
        }}
        onClick={handleNewChat}
      >
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 2,
          }}
        >
          <AddIcon sx={{ fontSize: 40 }} />
        </Box>
        <KineticTypography variant="h3" component="h2" gutterBottom>
          {t('dashboard.newChat', 'New Conversation')}
        </KineticTypography>
        <Typography variant="body1" color="text.secondary" align="center">
          {t('dashboard.newChatDesc', 'Start a new task with the AI agent.')}
        </Typography>
      </GlassPanel>

      {/* Recent Conversations (List Tile) */}
      <GlassPanel
        refractive={!isEcoMode}
        sx={{ gridColumn: 'span 1', gridRow: 'span 2', minHeight: 300 }}
      >
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ChatIcon color="primary" />
            <KineticTypography variant="h6">{t('dashboard.recent', 'Recent')}</KineticTypography>
          </Box>
          <List dense>
            {loadingRecent ? (
              Array.from(new Array(3)).map((_, i) => (
                <ListItem key={i} disablePadding>
                  <Box sx={{ width: '100%', p: 1 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="40%" height={12} />
                  </Box>
                </ListItem>
              ))
            ) : recentConversations && recentConversations.length > 0 ? (
              recentConversations.map((c) => (
                <ListItem key={c.id} disablePadding>
                  <ListItemButton
                    sx={{ borderRadius: 2 }}
                    onClick={() => handleSelectConversation(c.id)}
                  >
                    <ListItemText
                      primary={c.title || t('conversation.untitled', 'Untitled Chat')}
                      secondary={
                        c.updatedAt
                          ? new Date(c.updatedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : ''
                      }
                      primaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            ) : (
              <ListItem>
                <Typography variant="body2" color="text.secondary">
                  {t('dashboard.noRecent', 'No recent conversations')}
                </Typography>
              </ListItem>
            )}

            {orgId && (
              <ListItem disablePadding>
                <ListItemButton
                  sx={{ borderRadius: 2, justifyContent: 'center' }}
                  onClick={() => navigate(`/app/orgs/${orgId}/inbox`)}
                >
                  <Typography variant="caption" color="primary">
                    {t('dashboard.viewAll', 'View All')}
                  </Typography>
                </ListItemButton>
              </ListItem>
            )}
          </List>
        </CardContent>
      </GlassPanel>

      {/* Templates (Grid Tile) - Only show if orgId is present */}
      {orgId && (
        <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: 'span 2', minHeight: 200 }}>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <ArticleIcon color="secondary" />
              <KineticTypography variant="h6">
                {t('dashboard.templates', 'Templates')}
              </KineticTypography>
            </Box>

            {loadingTemplates ? (
              <Box
                display="grid"
                gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))"
                gap={2}
              >
                {Array.from(new Array(3)).map((_, i) => (
                  <Skeleton key={i} variant="rectangular" height={60} sx={{ borderRadius: 2 }} />
                ))}
              </Box>
            ) : templates && templates.length > 0 ? (
              <Box
                display="grid"
                gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))"
                gap={2}
              >
                {templates.slice(0, 6).map((template) => (
                  <SpecularButton
                    key={template.id}
                    variant="outlined"
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      p: 2,
                      borderColor: 'rgba(255,255,255,0.1)',
                      height: '100%',
                    }}
                    onClick={() => {
                      navigate(`/app/orgs/${orgId}/prompt-templates`);
                    }}
                  >
                    {template.name}
                  </SpecularButton>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t('dashboard.noTemplates', 'No templates found')}
              </Typography>
            )}
          </CardContent>
        </GlassPanel>
      )}

      {/* System Status (Utility Tile) */}
      <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: 'span 1', minHeight: 200 }}>
        <CardContent>
          <KineticTypography variant="h6" gutterBottom>
            {t('dashboard.status', 'System Status')}
          </KineticTypography>
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
            <Typography variant="body2">All Systems Operational</Typography>
          </Box>
          <Typography variant="caption" color="text.secondary">
            v2026.1.0-kinetic
          </Typography>
        </CardContent>
      </GlassPanel>
    </BentoGrid>
  );
};

// Optimized with React.memo to prevent unnecessary re-renders when parent state updates
// (e.g., when ChatPage state changes while ChatView is empty).
export const DashboardBentoGrid = React.memo(DashboardBentoGridComponent);
