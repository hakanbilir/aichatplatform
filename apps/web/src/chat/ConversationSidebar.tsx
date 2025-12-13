// apps/web/src/chat/ConversationSidebar.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  ConversationListItem,
  ConversationListResponse,
  createOrgConversation,
  listOrgConversations,
  updateConversation,
} from '../api/conversations';

interface ConversationSidebarProps {
  selectedConversationId?: string;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({ selectedConversationId }) => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');

  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuConversationId, setMenuConversationId] = useState<string | null>(null);

  const load = async (opts: { append: boolean; cursor?: string; search?: string }) => {
    if (!token || !orgId) return;

    if (opts.append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const res: ConversationListResponse = await listOrgConversations(token, orgId, {
        search: opts.search ?? search,
        limit: 30,
        cursor: opts.cursor,
      });

      setNextCursor(res.nextCursor);

      if (opts.append) {
        setItems((prev) => [...prev, ...res.items]);
      } else {
        setItems(res.items);
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to load conversations');
    } finally {
      if (opts.append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Initial load
    void load({ append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, orgId]);

  const handleSearchSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    void load({ append: false, search });
  };

  const handleNewChat = async () => {
    if (!token || !orgId) return;
    try {
      const convo = await createOrgConversation(token, orgId, {});
      // Optimistically prepend new conversation
      setItems((prev) => [convo, ...prev]);
      navigate(`/app/orgs/${orgId}/chat/${convo.id}`);
    } catch (err) {
      setError((err as Error).message || 'Failed to create conversation');
    }
  };

  const handleSelect = (id: string) => {
    if (!orgId) return;
    navigate(`/app/orgs/${orgId}/chat/${id}`);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, conversationId: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuConversationId(conversationId);
  };

  const handleCloseMenu = () => {
    setMenuAnchorEl(null);
    setMenuConversationId(null);
  };

  const handleBeginRename = (item: ConversationListItem) => {
    setEditingConversationId(item.id);
    setEditingTitle(item.title || '');
    handleCloseMenu();
  };

  const handleSaveTitle = async (conversationId: string, title: string) => {
    if (!token) return;
    const trimmed = title.trim();
    const newTitle = trimmed || t('sidebar.untitledChat');

    try {
      const response = await updateConversation(token, conversationId, { title: newTitle });
      const updated = response.conversation;
      setItems((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                title: updated.title,
              }
            : c,
        ),
      );
    } catch (err) {
      setError((err as Error).message || 'Failed to rename conversation');
    } finally {
      setEditingConversationId(null);
      setEditingTitle('');
    }
  };

  const handleTogglePinned = async (item: ConversationListItem) => {
    if (!token) return;
    try {
      const response = await updateConversation(token, item.id, { pinned: !item.pinned });
      const updated = response.conversation;
      setItems((prev) =>
        prev.map((c) =>
          c.id === item.id
            ? {
                ...c,
                pinned: updated.pinned ?? false,
                archivedAt: updated.archivedAt ?? c.archivedAt,
                lastActivityAt: updated.lastActivityAt ?? c.lastActivityAt,
              }
            : c,
        ),
      );
    } catch (err) {
      setError((err as Error).message || 'Failed to update conversation');
    } finally {
      handleCloseMenu();
    }
  };

  const handleArchive = async (item: ConversationListItem) => {
    if (!token) return;
    try {
      await updateConversation(token, item.id, { archived: true });
      setItems((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err) {
      setError((err as Error).message || 'Failed to archive conversation');
    } finally {
      handleCloseMenu();
    }
  };

  const pinned = useMemo(() => items.filter((i) => i.pinned), [items]);
  const others = useMemo(() => items.filter((i) => !i.pinned), [items]);

  const menuConversation = useMemo(
    () => items.find((c) => c.id === menuConversationId) || null,
    [items, menuConversationId],
  );

  return (
    <Box
      sx={{
        width: 290,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: (theme) => `1px solid ${theme.palette.divider}`,
        background:
          'linear-gradient(180deg, rgba(17,24,39,0.98), rgba(15,23,42,0.98)), radial-gradient(circle at top left, rgba(124,77,255,0.18), transparent 55%)',
        color: 'rgba(255,255,255,0.92)',
      }}
    >
      <Box p={2} pb={1} display="flex" flexDirection="column" gap={1.5}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1">{t('sidebar.title')}</Typography>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewChat}
            sx={{ borderRadius: 999, textTransform: 'none' }}
          >
            {t('sidebar.new')}
          </Button>
        </Box>

        <Box component="form" onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('sidebar.searchPlaceholder')}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 999,
                backgroundColor: 'rgba(15,23,42,0.9)',
                '& fieldset': {
                  borderColor: 'rgba(148,163,184,0.5)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(209,213,219,0.8)',
                },
              },
              '& .MuiInputBase-input': {
                color: 'rgba(248,250,252,0.95)',
              },
            }}
          />
        </Box>

        {error && (
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        )}
      </Box>

      <Box flex={1} overflow="auto" px={1} pb={1}>
        {loading && !items.length ? (
          <Box display="flex" alignItems="center" justifyContent="center" mt={4}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <>
            {pinned.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    mb: 0.5,
                    textTransform: 'uppercase',
                    letterSpacing: 0.08,
                    opacity: 0.7,
                  }}
                >
                  {t('sidebar.pinned')}
                </Typography>
                <List dense disablePadding>
                  {pinned.map((item) => {
                    const isSelected = item.id === selectedConversationId;
                    const isEditing = item.id === editingConversationId;

                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={() => handleSelect(item.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          '&.Mui-selected': {
                            background: 'linear-gradient(90deg, rgba(124,77,255,0.35), rgba(3,218,198,0.25))',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(30,64,175,0.45)',
                          },
                        }}
                      >
                        {isEditing ? (
                          <TextField
                            autoFocus
                            size="small"
                            value={editingTitle}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingConversationId(null);
                                setEditingTitle('');
                              }
                            }}
                            onBlur={() => {
                              if (!editingConversationId) return;
                              void handleSaveTitle(editingConversationId, editingTitle);
                            }}
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
                              <IconButton size="small" edge="end" onClick={(e) => handleOpenMenu(e, item.id)}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </>
            )}

            {others.length > 0 && (
              <>
                {pinned.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      px: 1.5,
                      mt: 1,
                      mb: 0.5,
                      textTransform: 'uppercase',
                      letterSpacing: 0.08,
                      opacity: 0.7,
                  }}
                >
                  {t('sidebar.recent')}
                </Typography>
                )}
                <List dense disablePadding>
                  {others.map((item) => {
                    const isSelected = item.id === selectedConversationId;
                    const isEditing = item.id === editingConversationId;

                    return (
                      <ListItemButton
                        key={item.id}
                        selected={isSelected}
                        onClick={() => handleSelect(item.id)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          '&.Mui-selected': {
                            background: 'linear-gradient(90deg, rgba(56,189,248,0.25), rgba(94,234,212,0.25))',
                          },
                          '&:hover': {
                            backgroundColor: 'rgba(15,23,42,0.85)',
                          },
                        }}
                      >
                        {isEditing ? (
                          <TextField
                            autoFocus
                            size="small"
                            value={editingTitle}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingConversationId(null);
                                setEditingTitle('');
                              }
                            }}
                            onBlur={() => {
                              if (!editingConversationId) return;
                              void handleSaveTitle(editingConversationId, editingTitle);
                            }}
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
                            primaryTypographyProps={{ noWrap: true, fontSize: 14 }}
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
                              <IconButton size="small" edge="end" onClick={(e) => handleOpenMenu(e, item.id)}>
                                <MoreVertIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </ListItemSecondaryAction>
                        )}
                      </ListItemButton>
                    );
                  })}
                </List>
              </>
            )}

            {!items.length && !loading && (
              <Box px={2} py={3}>
                <Typography variant="body2" color="rgba(148,163,184,0.9)">
                  {t('sidebar.noConversations')}
                </Typography>
              </Box>
            )}

            {nextCursor && (
              <Box display="flex" justifyContent="center" mt={1} mb={1.5}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => load({ append: true, cursor: nextCursor })}
                  disabled={loadingMore}
                >
                  {loadingMore ? t('sidebar.loading') : t('sidebar.loadMore')}
                </Button>
              </Box>
            )}
          </>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && Boolean(menuConversation)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuConversation && (
          <>
            <MenuItem
              onClick={() => {
                handleBeginRename(menuConversation);
              }}
            >
              {t('sidebar.rename')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                void handleTogglePinned(menuConversation);
              }}
            >
              {menuConversation.pinned ? t('sidebar.unpin') : t('sidebar.pin')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                void handleArchive(menuConversation);
              }}
            >
              {t('sidebar.archive')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                window.dispatchEvent(new CustomEvent('conversation-export', { detail: menuConversation.id }));
                handleCloseMenu();
              }}
            >
              {t('sidebar.export')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                window.dispatchEvent(new CustomEvent('conversation-share', { detail: menuConversation.id }));
                handleCloseMenu();
              }}
            >
              {t('sidebar.share')}
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );
};
