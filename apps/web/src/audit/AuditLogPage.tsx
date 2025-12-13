// apps/web/src/audit/AuditLogPage.tsx

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useParams } from 'react-router-dom';
import { useAuditLog } from './useAuditLog';

export const AuditLogPage: React.FC = () => {
  const { t } = useTranslation(['audit', 'common']);
  const { orgId } = useParams<{ orgId: string }>();

  const {
    query,
    setQuery,
    response,
    events,
    loading,
    error
  } = useAuditLog(orgId || null, { page: 0, pageSize: 25 });

  const gradientBg =
    'radial-gradient(circle at top left, rgba(251,191,36,0.16), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

  const totalPages = response ? Math.ceil(response.total / response.pageSize) : 0;

  const handleRefresh = () => {
    setQuery((prev) => ({ ...prev }));
  };

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
        <IconButton size="small" onClick={handleRefresh} aria-label={t('refresh')}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1, minHeight: 200 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={1.5}>
            <Box display="flex" alignItems="center" gap={1} flex={2}>
              <SearchIcon fontSize="small" />
              <TextField
                label={t('eventTypeContains')}
                size="small"
                fullWidth
                value={query.type || ''}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    page: 0,
                    type: e.target.value || undefined
                  }))
                }
              />
            </Box>
            <Box display="flex" alignItems="center" gap={1} flex={1}>
              <Typography variant="caption" color="text.secondary">
                {t('pageSize')}
              </Typography>
              <Select
                size="small"
                value={query.pageSize || 25}
                onChange={(e) =>
                  setQuery((prev) => ({
                    ...prev,
                    pageSize: Number(e.target.value),
                    page: 0
                  }))
                }
              >
                <MenuItem value={10}>10</MenuItem>
                <MenuItem value={25}>25</MenuItem>
                <MenuItem value={50}>50</MenuItem>
              </Select>
            </Box>
          </Box>

          {loading && (
            <Box mt={2}>
              {Array.from({ length: 5 }).map((_, idx) => (
                <Skeleton key={idx} variant="rectangular" height={32} sx={{ mb: 1 }} />
              ))}
            </Box>
          )}

          {!loading && error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          {!loading && !error && events.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('noEvents')}
            </Typography>
          )}

          {!loading && !error && events.length > 0 && (
            <Box sx={{ overflow: 'auto', mt: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{t('timestamp')}</TableCell>
                    <TableCell>{t('user')}</TableCell>
                    <TableCell>{t('action')}</TableCell>
                    <TableCell>{t('conversation')}</TableCell>
                    <TableCell>{t('metadata')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {events.map((ev) => (
                    <TableRow key={ev.id} hover>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(ev.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {ev.user ? (
                          <Box display="flex" flexDirection="column">
                            <Typography variant="body2">{ev.user.displayName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {ev.user.email}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            {t('system')}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={ev.type} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {ev.conversationId ? (
                          <Tooltip title={t('openConversation')}>
                            <Typography
                              variant="caption"
                              color="primary"
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                if (!orgId) return;
                                window.open(
                                  `/app/orgs/${orgId}/chat/${ev.conversationId}`,
                                  '_blank'
                                );
                              }}
                            >
                              {ev.conversationId.slice(0, 8)}…
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            maxWidth: 320,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {JSON.stringify(ev.metadata)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {response && totalPages > 1 && (
            <Box mt={1.5} display="flex" justifyContent="center">
              <Pagination
                count={totalPages}
                size="small"
                page={(query.page || 0) + 1}
                onChange={(_, p) =>
                  setQuery((prev) => ({
                    ...prev,
                    page: p - 1
                  }))
                }
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

