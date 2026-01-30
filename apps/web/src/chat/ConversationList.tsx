import React, { useEffect, useState, useCallback } from 'react';
import { Box, List, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { listConversations, ConversationListItem } from '../api/conversations';
import { useAuth } from '../auth/AuthContext';

import { ConversationListItemView } from './ConversationListItemView';

interface ConversationListProps {}

export const ConversationList: React.FC<ConversationListProps> = () => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      if (!token) return; // Type guard / Tip koruması
      try {
        const resp = await listConversations(token);
        if (!cancelled) {
          setItems(resp.conversations);
          if (!selectedId && resp.conversations.length > 0) {
            setSelectedId(resp.conversations[0].id);
            const event = new CustomEvent('select-conversation', { detail: resp.conversations[0].id });
            window.dispatchEvent(event);
          }
        }
      } catch {
        // ignore errors
      }
    }

    load();

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (!detail) return;
      setItems((prev) => [
        {
          id: detail,
          title: t('sidebar.newConversation'),
          model: 'llama3.1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          orgId: null,
        },
        ...prev,
      ]);
      setSelectedId(detail);
    };

    window.addEventListener('conversation-created', handler);

    return () => {
      cancelled = true;
      window.removeEventListener('conversation-created', handler);
    };
    // Optimization: Remove selectedId to prevent re-fetching list on selection change
  }, [token]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const event = new CustomEvent('select-conversation', { detail: id });
    window.dispatchEvent(event);
  }, []);

  if (!token) {
    return null;
  }

  if (items.length === 0) {
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
      {items.map((c) => (
        <ConversationListItemView
          key={c.id}
          item={c}
          selected={c.id === selectedId}
          onSelect={handleSelect}
        />
      ))}
    </List>
  );
};

