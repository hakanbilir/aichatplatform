import React from 'react';
import { ListItemButton, ListItemText, ListItemSecondaryAction, IconButton, TextField, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';

import { ConversationListItem } from '../api/conversations';

interface ConversationListItemViewProps {
  item: ConversationListItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  isEditing?: boolean;
  editingTitle?: string;
  onEditChange?: (value: string) => void;
  onSave?: (id: string, title: string) => void;
  onCancel?: () => void;
}

export const ConversationListItemView = React.memo<ConversationListItemViewProps>(({
  item,
  selected,
  onSelect,
  onMenuOpen,
  isEditing,
  editingTitle,
  onEditChange,
  onSave,
  onCancel
}) => {
  const { t } = useTranslation('chat');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSave?.(item.id, editingTitle || '');
    }
    if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  const handleBlur = () => {
    onSave?.(item.id, editingTitle || '');
  };

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
      {isEditing ? (
        <TextField
          autoFocus
          size="small"
          value={editingTitle}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onEditChange?.(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          variant="outlined"
          fullWidth
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 32,
              fontSize: 13,
              backgroundColor: 'rgba(0,0,0,0.2)',
              '& fieldset': { border: 'none' },
            },
            '& .MuiInputBase-input': {
               color: 'white',
               p: '4px 8px',
            }
          }}
        />
      ) : (
        <ListItemText
          primary={item.title || t('sidebar.untitled')}
          secondary={new Date(item.updatedAt).toLocaleTimeString()}
          primaryTypographyProps={{ noWrap: true, fontSize: 13, fontWeight: item.pinned ? 600 : 400 }}
          secondaryTypographyProps={{ noWrap: true, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}
        />
      )}
      {!isEditing && (
        <ListItemSecondaryAction>
            <Tooltip title={t('sidebar.moreActions')}>
                <IconButton
                    size="small"
                    edge="end"
                    aria-label={t('sidebar.moreActions')}
                    onClick={(e) => onMenuOpen(e, item.id)}
                    sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        </ListItemSecondaryAction>
      )}
    </ListItemButton>
  );
});

ConversationListItemView.displayName = 'ConversationListItemView';
