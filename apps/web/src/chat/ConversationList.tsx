import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  Menu,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import {
  ConversationListItem,
  ConversationListResponse,
  listOrgConversations,
  listConversations,
  updateConversation,
  createOrgConversation,
  createConversation,
} from '../api/conversations';

import { ConversationListItemView } from './ConversationListItemView';

const ConversationListComponent: React.FC = () => {
  const { t } = useTranslation('chat');
  const { token } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<ConversationListItem[]>([]);
  // Optimization: Cache all personal items to avoid re-fetching on search.
  // Using ref to prevent extra re-renders when updating cache and to ensure synchronous updates for filters.
  const allPersonalItemsRef = useRef<ConversationListItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Menu state
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [menuConversationId, setMenuConversationId] = useState<string | null>(null);

  // Edit state
  const [editingConversationId, setEditingConversationId] = useState<string | null>(null);

  // Handle URL changes to select conversation
  const { conversationId } = useParams<{ conversationId: string }>();
  useEffect(() => {
    if (conversationId) {
      setSelectedId(conversationId);
    }
  }, [conversationId]);

  const load = useCallback(
    async (opts: { append: boolean; cursor?: string; search?: string }) => {
      if (!token) return;

      if (opts.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        let newItems: ConversationListItem[] = [];
        let next: string | null = null;

        if (orgId) {
          // Org-scoped (paginated, searchable)
          const res: ConversationListResponse = await listOrgConversations(token, orgId, {
            search: opts.search ?? search,
            limit: 30,
            cursor: opts.cursor,
          });
          newItems = res.items;
          next = res.nextCursor;

          if (opts.append) {
            setItems((prev) => [...prev, ...newItems]);
          } else {
            setItems(newItems);
          }
        } else {
          // Personal / Global (flat list, no search/pagination params in API definition yet)
          // Optimization: Use cached items if available
          let sourceItems = allPersonalItemsRef.current;

          // If not cached, fetch from API
          if (!sourceItems) {
            const res = await listConversations(token);
            sourceItems = res.conversations;
            allPersonalItemsRef.current = sourceItems;
          }

          const baseItems = sourceItems || [];

          // Optimization: Single-pass filter to split pinned/unpinned and apply search
          const allPinned: ConversationListItem[] = [];
          const allUnpinned: ConversationListItem[] = [];

          const rawSearch = opts.search ?? search;
          const q = rawSearch ? rawSearch.toLowerCase() : null;

          for (let i = 0; i < baseItems.length; i++) {
            const c = baseItems[i];

            // Apply search filter if active
            if (q && !(c.title || '').toLowerCase().includes(q)) {
              continue;
            }

            // Separate pinned vs unpinned
            if (c.pinned) {
              allPinned.push(c);
            } else {
              allUnpinned.push(c);
            }
          }

          // Optimization: Client-side pagination for personal items to improve performance

          // Pagination for unpinned items
          const LIMIT = 50;
          const offset = opts.cursor ? parseInt(opts.cursor, 10) : 0;
          const pageUnpinned = allUnpinned.slice(offset, offset + LIMIT);

          const hasMore = offset + LIMIT < allUnpinned.length;
          next = hasMore ? (offset + LIMIT).toString() : null;

          if (opts.append) {
            setItems((prev) => {
              const newPageIds = new Set(pageUnpinned.map((i) => i.id));
              const uniquePrev = prev.filter((i) => !newPageIds.has(i.id));
              return [...uniquePrev, ...pageUnpinned];
            });
          } else {
            // Initial load or search reset: pinned + first page of unpinned
            setItems([...allPinned, ...pageUnpinned]);
          }
        }

        setNextCursor(next);
      } catch (err) {
        setError((err as Error).message || 'Failed to load conversations');
      } finally {
        if (opts.append) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [token, orgId, search],
  ); // search dependency for client-side filtering logic if needed

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeout = setTimeout(() => {
      void load({ append: false });
    }, 500);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, token, orgId]);

  // Listen for creation events
  useEffect(() => {
    const handleCreated = async (_e: Event) => {
      // Invalidate cache
      allPersonalItemsRef.current = null;
      // Refresh list to show new item
      void load({ append: false });
    };

    // Also listen for selection events from other components
    const handleSelectListener = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id) setSelectedId(id);
    };

    const handleCreate = async () => {
      // Create new conversation
      if (!token) return;
      try {
        let convo: ConversationListItem;
        if (orgId) {
          convo = await createOrgConversation(token, orgId, { title: t('conversation.new') });
          navigate(`/app/orgs/${orgId}/chat/${convo.id}`);
        } else {
          convo = await createConversation(token, { title: t('conversation.new') });
          navigate(`/app/chat/${convo.id}`);
        }
        // Optimistically prepend
        setItems((prev) => [convo, ...prev]);
        if (!orgId) {
          if (allPersonalItemsRef.current) {
            allPersonalItemsRef.current = [convo, ...allPersonalItemsRef.current];
          }
        }
        setSelectedId(convo.id);
      } catch (err) {
        console.error(err);
      }
    };

    window.addEventListener('conversation-created', handleCreated);
    window.addEventListener('select-conversation', handleSelectListener);
    window.addEventListener('create-conversation', handleCreate);

    return () => {
      window.removeEventListener('conversation-created', handleCreated);
      window.removeEventListener('select-conversation', handleSelectListener);
      window.removeEventListener('create-conversation', handleCreate);
    };
  }, [token, orgId, navigate, t, load]);

  const handleSelect = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (orgId) {
        navigate(`/app/orgs/${orgId}/chat/${id}`);
      } else {
        navigate(`/app/chat/${id}`);
      }
      // Dispatch global event for other components listening (e.g. mobile drawer)
      window.dispatchEvent(new CustomEvent('select-conversation', { detail: id }));
    },
    [orgId, navigate],
  );

  const handleMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>, id: string) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setMenuConversationId(id);
  }, []);

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setMenuConversationId(null);
  };

  const handleBeginRename = (item: ConversationListItem) => {
    setEditingConversationId(item.id);
    handleMenuClose();
  };

  const handleSaveTitle = useCallback(
    async (id: string, title: string) => {
      if (!token) return;
      const trimmed = title.trim();
      const newTitle = trimmed || t('sidebar.untitledChat');

      try {
        const response = await updateConversation(token, id, { title: newTitle });
        const updated = response.conversation;
        const updater = (c: ConversationListItem) =>
          c.id === id ? { ...c, title: updated.title } : c;

        setItems((prev) => prev.map(updater));
        if (!orgId) {
          if (allPersonalItemsRef.current) {
            allPersonalItemsRef.current = allPersonalItemsRef.current.map(updater);
          }
        }
      } catch (err) {
        setError((err as Error).message || 'Failed to rename conversation');
      } finally {
        setEditingConversationId(null);
      }
    },
    [token, t, orgId],
  );

  const handleCancelEdit = useCallback(() => {
    setEditingConversationId(null);
  }, []);

  const handleTogglePinned = async (item: ConversationListItem) => {
    if (!token) return;
    try {
      const response = await updateConversation(token, item.id, { pinned: !item.pinned });
      const updated = response.conversation;
      const updater = (c: ConversationListItem) =>
        c.id === item.id
          ? {
              ...c,
              pinned: updated.pinned ?? false,
              archivedAt: updated.archivedAt ?? c.archivedAt,
              lastActivityAt: updated.lastActivityAt ?? c.lastActivityAt,
            }
          : c;

      setItems((prev) => prev.map(updater));
      if (!orgId) {
        if (allPersonalItemsRef.current) {
          allPersonalItemsRef.current = allPersonalItemsRef.current.map(updater);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to update conversation');
    } finally {
      handleMenuClose();
    }
  };

  const handleArchive = async (item: ConversationListItem) => {
    if (!token) return;
    try {
      await updateConversation(token, item.id, { archived: true });
      const filter = (c: ConversationListItem) => c.id !== item.id;
      setItems((prev) => prev.filter(filter));
      if (!orgId) {
        if (allPersonalItemsRef.current) {
          allPersonalItemsRef.current = allPersonalItemsRef.current.filter(filter);
        }
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to archive conversation');
    } finally {
      handleMenuClose();
    }
  };

  // Optimization: Reduce complexity from O(2N) to O(N) by filtering in a single pass
  const { pinned, others } = useMemo(() => {
    const pinnedItems: ConversationListItem[] = [];
    const otherItems: ConversationListItem[] = [];

    items.forEach((item) => {
      if (item.pinned) {
        pinnedItems.push(item);
      } else {
        otherItems.push(item);
      }
    });

    return { pinned: pinnedItems, others: otherItems };
  }, [items]);

  const menuConversation = useMemo(
    () => items.find((c) => c.id === menuConversationId) || null,
    [items, menuConversationId],
  );

  return (
    <Box display="flex" flexDirection="column" height="100%">
      <Box px={1} pb={1}>
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('sidebar.searchPlaceholder')}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,0.5)' }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label={t('sidebar.clearSearch')}
                  onClick={handleClearSearch}
                  edge="end"
                  sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: 'white' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'rgba(255,255,255,0.05)',
              '& fieldset': { border: 'none' },
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' },
              '&.Mui-focused': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.2)',
              },
            },
            '& .MuiInputBase-input': { color: 'white' },
          }}
        />
      </Box>

      {error && (
        <Box px={2} pb={1}>
          <Typography variant="caption" color="error">
            {error}
          </Typography>
        </Box>
      )}

      <Box flex={1} overflow="auto" px={1}>
        {loading && items.length === 0 ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress size={24} sx={{ color: 'rgba(255,255,255,0.3)' }} />
          </Box>
        ) : items.length === 0 ? (
          <Box mt={2} px={1}>
            <Typography variant="body2" color="rgba(255,255,255,0.5)">
              {t('sidebar.noConversations')}
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {pinned.length > 0 && (
              <>
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.5,
                    mb: 0.5,
                    display: 'block',
                    textTransform: 'uppercase',
                    letterSpacing: 0.08,
                    opacity: 0.5,
                    fontSize: '0.7rem',
                  }}
                >
                  {t('sidebar.pinned')}
                </Typography>
                {pinned.map((item) => (
                  <ConversationListItemView
                    key={item.id}
                    item={item}
                    selected={item.id === selectedId}
                    onSelect={handleSelect}
                    onMenuOpen={handleMenuOpen}
                    isEditing={item.id === editingConversationId}
                    onSave={handleSaveTitle}
                    onCancel={handleCancelEdit}
                  />
                ))}
                <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
              </>
            )}

            {others.length > 0 && pinned.length > 0 && (
              <Typography
                variant="caption"
                sx={{
                  px: 1.5,
                  mb: 0.5,
                  mt: 1,
                  display: 'block',
                  textTransform: 'uppercase',
                  letterSpacing: 0.08,
                  opacity: 0.5,
                  fontSize: '0.7rem',
                }}
              >
                {t('sidebar.recent')}
              </Typography>
            )}

            {others.map((item) => (
              <ConversationListItemView
                key={item.id}
                item={item}
                selected={item.id === selectedId}
                onSelect={handleSelect}
                onMenuOpen={handleMenuOpen}
                isEditing={item.id === editingConversationId}
                onSave={handleSaveTitle}
                onCancel={handleCancelEdit}
              />
            ))}

            {nextCursor && (
              <Box display="flex" justifyContent="center" mt={2} mb={2}>
                <Button
                  size="small"
                  onClick={() => load({ append: true, cursor: nextCursor })}
                  disabled={loadingMore}
                  sx={{
                    color: 'rgba(255,255,255,0.6)',
                    borderColor: 'rgba(255,255,255,0.2)',
                    '&:hover': {
                      borderColor: 'rgba(255,255,255,0.4)',
                      bgcolor: 'rgba(255,255,255,0.05)',
                    },
                  }}
                  variant="outlined"
                  data-ai-action="load--append-true-cursor-nextcursor"
                >
                  {loadingMore ? t('sidebar.loading') : t('sidebar.loadMore')}
                </Button>
              </Box>
            )}
          </List>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl) && Boolean(menuConversation)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuConversation && [
          <MenuItem key="rename" onClick={() => handleBeginRename(menuConversation)}>
            {t('sidebar.rename')}
          </MenuItem>,
          <MenuItem key="pin" onClick={() => void handleTogglePinned(menuConversation)}>
            {menuConversation.pinned ? t('sidebar.unpin') : t('sidebar.pin')}
          </MenuItem>,
          <MenuItem key="archive" onClick={() => void handleArchive(menuConversation)}>
            {t('sidebar.archive')}
          </MenuItem>,
          <MenuItem
            key="export"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('conversation-export', { detail: menuConversation.id }),
              );
              handleMenuClose();
            }}
          >
            {t('sidebar.export')}
          </MenuItem>,
          <MenuItem
            key="share"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent('conversation-share', { detail: menuConversation.id }),
              );
              handleMenuClose();
            }}
          >
            {t('sidebar.share')}
          </MenuItem>,
        ]}
      </Menu>
    </Box>
  );
};

export const ConversationList = React.memo(ConversationListComponent);
