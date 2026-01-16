import React, { useEffect, useState } from 'react';
import { Box, List, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import { useConversations } from '../hooks/api/useConversations';

interface ConversationListProps {}

export const ConversationList: React.FC<ConversationListProps> = () => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const { conversations, mutate } = useConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Auto-select first conversation on initial load if none selected
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      const firstId = conversations[0].id;
      setSelectedId(firstId);
      const event = new CustomEvent('select-conversation', { detail: firstId });
      window.dispatchEvent(event);
    }
  }, [conversations, selectedId]);

  useEffect(() => {
    // Listen for conversation creation to optimistically add it or refresh
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;

      setSelectedId(detail);
      mutate(); // Refresh the list
    };

    window.addEventListener('conversation-created', handler);
    return () => {
      window.removeEventListener('conversation-created', handler);
    };
  }, [mutate]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const event = new CustomEvent('select-conversation', { detail: id });
    window.dispatchEvent(event);
  };

  if (!token) {
    return null;
  }

  if (conversations.length === 0) {
    return (
      <Box mt={2}>
        <Typography variant="body2" color="rgba(255,255,255,0.8)">
          {t('sidebar.noConversations')}
        </Typography>
        <Typography variant="caption" color="rgba(255,255,255,0.6)">
          {t('empty.description')}
        </Typography>
      </Box>
    );
  }

  return (
    <List dense disablePadding>
      {conversations.map((c) => (
        <ListItemButton
          key={c.id}
          selected={c.id === selectedId}
          onClick={() => handleSelect(c.id)}
          sx={{ borderRadius: 2, mb: 0.5 }}
        >
          <ListItemText
            primary={c.title || t('sidebar.untitled')}
            secondary={new Date(c.updatedAt).toLocaleTimeString()}
            primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
            secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
          />
        </ListItemButton>
      ))}
    </List>
  );
};

