import React, { useState, useEffect } from 'react';
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

interface ConversationListItemViewProps {
  item: ConversationListItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  isEditing?: boolean;
  onSave?: (id: string, title: string) => void;
  onCancel?: () => void;
}

export const ConversationListItemView = React.memo<ConversationListItemViewProps>(
  ({ item, selected, onSelect, onMenuOpen, isEditing, onSave, onCancel }) => {
    const { t } = useTranslation('chat');
    const [localTitle, setLocalTitle] = useState(item.title || '');
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      if (isEditing) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalTitle(item.title || '');
        // Delay enabling blur save to prevent race condition with menu close focus restoration
        const timer = setTimeout(() => setIsReady(true), 200);
        return () => clearTimeout(timer);
      } else {
        setIsReady(false);
      }
    }, [isEditing, item.title]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onSave?.(item.id, localTitle || '');
      }
      if (e.key === 'Escape') {
        onCancel?.();
      }
    };

    const handleBlur = () => {
      if (isReady) {
        onSave?.(item.id, localTitle || '');
      }
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
          },
        }}
      >
        {isEditing ? (
          <TextField
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            size="small"
            value={localTitle}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setLocalTitle(e.target.value)}
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
              },
            }}
          />
        ) : (
          <ListItemText
            primary={item.title || t('sidebar.untitled')}
            secondary={new Date(item.updatedAt).toLocaleTimeString()}
            primaryTypographyProps={{
              noWrap: true,
              fontSize: 13,
              fontWeight: item.pinned ? 600 : 400,
            }}
            secondaryTypographyProps={{
              noWrap: true,
              fontSize: 11,
              color: 'rgba(255,255,255,0.6)',
            }}
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
  },
);

ConversationListItemView.displayName = 'ConversationListItemView';
