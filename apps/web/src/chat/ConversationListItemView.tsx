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
      sx={{ borderRadius: 2, mb: 0.5 }}
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
