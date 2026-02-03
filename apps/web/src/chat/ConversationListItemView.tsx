import React from 'react';
import { ListItemButton, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConversationListItem } from '../api/conversations';

interface ConversationListItemViewProps {
  item: ConversationListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const ConversationListItemView = React.memo<ConversationListItemViewProps>(({ item, selected, onSelect }) => {
  const { t } = useTranslation('chat');

  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(item.id)}
      sx={{
        borderRadius: '16px', // Kinetic radius
        mb: 0.5,
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
        ...(selected && {
          background: 'rgba(255, 255, 255, 0.1) !important', // Glass bg
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }),
        '&:hover': {
          background: selected ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          transform: 'translateY(-1px)',
        }
      }}
    >
      <ListItemText
        primary={item.title || t('sidebar.untitled')}
        secondary={new Date(item.updatedAt).toLocaleTimeString()}
        primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
        secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
      />
    </ListItemButton>
  );
});

ConversationListItemView.displayName = 'ConversationListItemView';
