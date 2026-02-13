import React from 'react';
import { Box, CardContent, IconButton, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import ArticleIcon from '@mui/icons-material/Article';
import { useNavigate } from 'react-router-dom';

import { BentoGrid } from '../ui/kinetic/BentoGrid';
import { GlassPanel } from '../ui/kinetic/GlassPanel';
import { KineticTypography } from '../ui/kinetic/KineticTypography';
import { SpecularButton } from '../ui/kinetic/SpecularButton';
import { useEcoMode } from '../../hooks/useEcoMode';

// Mock data or fetch via hooks in real implementation
// For now, we'll just show the structure as requested
// Ideally this should use useConversations and usePromptTemplates hooks

export const DashboardBentoGrid: React.FC = () => {
  const { t } = useTranslation('chat');
  const { isEcoMode } = useEcoMode();
  const navigate = useNavigate();

  const handleNewChat = () => {
    const event = new CustomEvent('create-conversation');
    window.dispatchEvent(event);
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
          '&:hover': { transform: 'scale(1.01)' }
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
            mb: 2
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
      <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: 'span 1', gridRow: 'span 2', minHeight: 300 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ChatIcon color="primary" />
            <KineticTypography variant="h6">
              {t('dashboard.recent', 'Recent')}
            </KineticTypography>
          </Box>
          <List dense>
            {/* Placeholder for recent chats */}
            {[1, 2, 3].map((i) => (
              <ListItem key={i} disablePadding>
                <ListItemButton sx={{ borderRadius: 2 }}>
                  <ListItemText
                    primary={`Project Alpha Discussion ${i}`}
                    secondary="2 hours ago"
                    primaryTypographyProps={{ noWrap: true }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
             <ListItem disablePadding>
                <ListItemButton sx={{ borderRadius: 2, justifyContent: 'center' }}>
                  <Typography variant="caption" color="primary">
                    {t('dashboard.viewAll', 'View All')}
                  </Typography>
                </ListItemButton>
              </ListItem>
          </List>
        </CardContent>
      </GlassPanel>

      {/* Templates (Grid Tile) */}
      <GlassPanel refractive={!isEcoMode} sx={{ gridColumn: 'span 2', minHeight: 200 }}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <ArticleIcon color="secondary" />
            <KineticTypography variant="h6">
              {t('dashboard.templates', 'Templates')}
            </KineticTypography>
          </Box>
          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(150px, 1fr))" gap={2}>
            {['Code Review', 'Blog Post', 'Email Draft'].map((template) => (
              <SpecularButton
                key={template}
                variant="outlined"
                sx={{
                  justifyContent: 'flex-start',
                  textAlign: 'left',
                  p: 2,
                  borderColor: 'rgba(255,255,255,0.1)',
                  height: '100%'
                }}
              >
                {template}
              </SpecularButton>
            ))}
          </Box>
        </CardContent>
      </GlassPanel>

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
