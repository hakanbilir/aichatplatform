// apps/web/src/inbox/ConversationInboxPage.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Chip,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Skeleton,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useConversationSearch } from '../search/useConversationSearch';
import { ConversationSearchHit } from '../api/search';

const gradientBg =
  'radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%), ' +
  'radial-gradient(circle at bottom right, rgba(94,234,212,0.12), transparent 55%)';

interface ConversationHitCardProps {
  hit: ConversationSearchHit;
  onOpen: () => void;
}

const ConversationHitCard: React.FC<ConversationHitCardProps> = ({ hit, onOpen }) => {
  const { t } = useTranslation('inbox');
  const firstSnippet = hit.messages[0]?.snippet || '';

  return (
    <Paper
      elevation={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      sx={{
        p: 1.5,
        borderRadius: 2.5,
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: (theme) => theme.shadows[2]
        },
        transition: 'border-color 120ms ease-out, box-shadow 120ms ease-out'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
        <Typography
          variant="subtitle2"
          noWrap
          sx={{ maxWidth: '70%' }}
        >
          {hit.conversationTitle}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {new Date(hit.updatedAt).toLocaleString()}
        </Typography>
      </Box>

      {firstSnippet && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}
        >
          {firstSnippet}
        </Typography>
      )}

      <Box display="flex" alignItems="center" justifyContent="space-between" mt={0.5}>
        <Typography variant="caption" color="text.secondary">
          {hit.modelId}
        </Typography>
        <Box display="flex" gap={0.5}>
          {hit.hasRag && <Chip size="small" label={t('rag')} variant="outlined" />}
          {hit.hasTools && <Chip size="small" label={t('tools')} variant="outlined" />}
          {hit.hasFiles && <Chip size="small" label={t('files')} variant="outlined" />}
        </Box>
      </Box>
    </Paper>
  );
};

export const ConversationInboxPage: React.FC = () => {
  const { t } = useTranslation(['inbox', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const {
    state,
    hits,
    results,
    loading,
    error,
    runSearch,
    setState
  } = useConversationSearch(orgId || null);

  useEffect(() => {
    // initial: sync from URL query param
    const q = searchParams.get('q') || '';
    if (q && q !== state.query) {
      setState((prev) => ({ ...prev, query: q, page: 0 }));
      void runSearch({ query: q, page: 0 });
    } else if (!q) {
      void runSearch({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQueryChange = (q: string) => {
    setState((prev) => ({ ...prev, query: q, page: 0 }));
    setSearchParams((params) => {
      if (q) params.set('q', q);
      else params.delete('q');
      return params;
    });
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      void runSearch({ page: 0 });
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, pageNumber: number) => {
    const zeroBased = pageNumber - 1;
    setState((prev) => ({ ...prev, page: zeroBased }));
    void runSearch({ page: zeroBased });
  };

  const totalPages = results ? Math.ceil(results.total / results.pageSize) : 0;

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        backgroundImage: gradientBg,
        backgroundColor: 'background.default'
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">{t('title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('subtitle')}
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={() => runSearch({})}
          aria-label={t('refresh', { ns: 'common' })}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Search bar & quick filters */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
        <TextField
          fullWidth
          placeholder={t('searchPlaceholder')}
          value={state.query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={t('advancedFilters')}>
                  <IconButton size="small" aria-label={t('advancedFilters')}>
                    <FilterAltOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />

        <Box display="flex" gap={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {t('sort')}
          </Typography>
          <Chip
            size="small"
            label={t('recent')}
            color={state.sort === 'recent' ? 'primary' : 'default'}
            onClick={() => {
              setState((prev) => ({ ...prev, sort: 'recent', page: 0 }));
              void runSearch({ sort: 'recent', page: 0 });
            }}
          />
          <Chip
            size="small"
            label={t('relevance')}
            color={state.sort === 'relevance' ? 'primary' : 'default'}
            onClick={() => {
              setState((prev) => ({ ...prev, sort: 'relevance', page: 0 }));
              void runSearch({ sort: 'relevance', page: 0 });
            }}
          />
        </Box>
      </Box>

      {/* Results list */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {loading && (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {Array.from({ length: 5 }).map((_, idx) => (
              <Skeleton key={idx} variant="rounded" height={72} />
            ))}
          </Box>
        )}

        {!loading && error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        {!loading && !error && hits.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t('noResults')}
          </Typography>
        )}

        {!loading && !error && hits.length > 0 && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(2, minmax(0, 1fr))',
                lg: 'repeat(3, minmax(0, 1fr))'
              },
              gap: 1.5
            }}
          >
            {hits.map((hit) => (
              <ConversationHitCard
                key={hit.conversationId}
                hit={hit}
                onOpen={() => {
                  if (!orgId) return;
                  navigate(`/app/orgs/${orgId}/chat/${hit.conversationId}`);
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Pagination */}
      {results && totalPages > 1 && (
        <Box display="flex" justifyContent="center">
          <Pagination
            count={totalPages}
            page={results.page + 1}
            onChange={handlePageChange}
            size="small"
          />
        </Box>
      )}
    </Box>
  );
};

