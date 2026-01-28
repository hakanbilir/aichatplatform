import React, { memo } from 'react';
import { ListItemButton, ListItemText } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { ConversationListItem } from '../api/conversations';

interface SidebarConversationItemProps {
  conversation: ConversationListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}

const SidebarConversationItemComponent: React.FC<SidebarConversationItemProps> = ({
  conversation,
  selected,
  onSelect,
}) => {
  const { t } = useTranslation('chat');

  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(conversation.id)}
      sx={{ borderRadius: 2, mb: 0.5 }}
    >
      <ListItemText
        primary={conversation.title || t('sidebar.untitled')}
        secondary={new Date(conversation.updatedAt).toLocaleTimeString()}
        primaryTypographyProps={{ noWrap: true, fontSize: 13 }}
        secondaryTypographyProps={{ noWrap: true, fontSize: 11 }}
      />
    </ListItemButton>
  );
};

export const SidebarConversationItem = memo(SidebarConversationItemComponent);
