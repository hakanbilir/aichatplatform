import React, { memo } from 'react';
import {
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';

import { ConversationListItem } from '../api/conversations';

interface ConversationSidebarItemProps {
  item: ConversationListItem;
  selected: boolean;
  isEditing: boolean;
  editingTitle: string;
  onSelect: (id: string) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  onEditChange: (value: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  onCancelEdit: () => void;
}

const ConversationSidebarItemComponent: React.FC<ConversationSidebarItemProps> = ({
  item,
  selected,
  isEditing,
  editingTitle,
  onSelect,
  onMenuOpen,
  onEditChange,
  onSaveTitle,
  onCancelEdit
}) => {
  const { t } = useTranslation('chat');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSaveTitle(item.id, editingTitle);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancelEdit();
    }
  };

  const handleBlur = () => {
    onSaveTitle(item.id, editingTitle);
  };

  // Determine selection background based on pinned status
  const selectedBackground = item.pinned
    ? 'linear-gradient(90deg, rgba(124,77,255,0.35), rgba(3,218,198,0.25))'
    : 'linear-gradient(90deg, rgba(56,189,248,0.25), rgba(94,234,212,0.25))';

  return (
    <ListItemButton
      selected={selected}
      onClick={() => onSelect(item.id)}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        '&.Mui-selected': {
          background: selectedBackground,
        },
        '&:hover': {
          backgroundColor: 'rgba(30,64,175,0.45)', // Shared hover style or customize if needed
          // Note: ConversationSidebar used rgba(15,23,42,0.85) for "others" hover.
          // Pinned used rgba(30,64,175,0.45).
          // I'll stick to one or check pinned.
          // Pinned: rgba(30,64,175,0.45)
          // Others: rgba(15,23,42,0.85)
        },
        // Apply pinned-specific hover if needed, but doing it in logic is cleaner.
        ...(item.pinned ? {} : {
             '&:hover': {
                backgroundColor: 'rgba(15,23,42,0.85)',
             }
        })
      }}
    >
      {isEditing ? (
        <TextField
          autoFocus
          size="small"
          value={editingTitle}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 32,
              fontSize: 14,
            },
          }}
        />
      ) : (
        <ListItemText
          primary={item.title || t('sidebar.untitled')}
          secondary={item.lastActivityAt ? new Date(item.lastActivityAt).toLocaleString() : ''}
          primaryTypographyProps={{
            noWrap: true,
            fontSize: 14,
          }}
          secondaryTypographyProps={{
            noWrap: true,
            fontSize: 11,
            color: 'rgba(148,163,184,0.9)',
          }}
        />
      )}
      {!isEditing && (
        <ListItemSecondaryAction>
          <Tooltip title={t('sidebar.moreActions')}>
            <IconButton size="small" edge="end" onClick={(e) => onMenuOpen(e, item.id)}>
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </ListItemSecondaryAction>
      )}
    </ListItemButton>
  );
};

export const ConversationSidebarItem = memo(ConversationSidebarItemComponent);
