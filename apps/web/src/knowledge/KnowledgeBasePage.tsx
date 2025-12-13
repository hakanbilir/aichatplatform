// apps/web/src/knowledge/KnowledgeBasePage.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Snackbar,
  Alert,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useKnowledgeSpaces } from './useKnowledgeSpaces';
import { useKnowledgeSearch } from './useKnowledgeSearch';
import { ingestTextDocument } from '../api/knowledge';
import { useAuth } from '../auth/AuthContext';

export const KnowledgeBasePage: React.FC = () => {
  const { t } = useTranslation(['knowledge', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();
  const { spaces, loading: spacesLoading, error: spacesError, createSpace } = useKnowledgeSpaces(
    orgId || null
  );
  const search = useKnowledgeSearch(orgId || null);

  const [createSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState('');

  const [ingestDialogOpen, setIngestDialogOpen] = useState(false);
  const [ingestTitle, setIngestTitle] = useState('');
  const [ingestText, setIngestText] = useState('');
  const [ingestSpaceId, setIngestSpaceId] = useState<string | undefined>(undefined);
  const [ingesting, setIngesting] = useState(false);

  // Snackbar state / Snackbar durumu
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) return;
    await createSpace(newSpaceName.trim());
    setNewSpaceName('');
    setCreateSpaceOpen(false);
  };

  const handleOpenIngestDialog = () => {
    if (spaces.length > 0 && !ingestSpaceId) {
      setIngestSpaceId(spaces[0].id);
    }
    setIngestDialogOpen(true);
  };

  const handleIngest = async () => {
    if (!token || !orgId) return;
    if (!ingestSpaceId || !ingestTitle.trim() || !ingestText.trim()) return;

    setIngesting(true);
    try {
      await ingestTextDocument(token, orgId, ingestSpaceId, ingestTitle.trim(), ingestText);
      setIngestDialogOpen(false);
      setIngestTitle('');
      setIngestText('');
      setSnackbar({
        open: true,
        message: t('ingestSuccess', { ns: 'knowledge' }) || 'Document ingested successfully',
        severity: 'success'
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: (err as Error).message || t('ingestError', { ns: 'knowledge' }) || 'Failed to ingest document',
        severity: 'error'
      });
    } finally {
      setIngesting(false);
    }
  };

  const gradientBg =
    'radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(139,92,246,0.22), transparent 55%)';

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        background: gradientBg
      }}
    >
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1.2}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">{t('title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('subtitle')}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setCreateSpaceOpen(true)}
          >
            {t('createSpace')}
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudUploadIcon />}
            onClick={handleOpenIngestDialog}
          >
            {t('ingestText')}
          </Button>
        </Box>
      </Box>

      {/* Content */}
      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} flex={1}>
        {/* Left column: spaces & info */}
        <Box flex={{ xs: 0, md: 0.4 }} minWidth={280} display="flex" flexDirection="column" gap={1.5}>
          <Card sx={{ borderRadius: 3, flex: 1, minHeight: 160 }}>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="subtitle2">{t('spaces')}</Typography>
              </Box>
              {spacesLoading && (
                <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                  <CircularProgress size={24} />
                </Box>
              )}
              {!spacesLoading && spacesError && (
                <Typography color="error" variant="body2">
                  {spacesError}
                </Typography>
              )}
              {!spacesLoading && !spacesError && spaces.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  {t('noSpaces')}
                </Typography>
              )}
              {!spacesLoading && !spacesError && spaces.length > 0 && (
                <Box display="flex" flexDirection="column" gap={0.75} mt={1}>
                  {spaces.map((space) => (
                    <Box
                      key={space.id}
                      sx={{
                        px: 1,
                        py: 0.75,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        },
                        transition: 'background-color 120ms ease-out'
                      }}
                    >
                      <Box>
                        <Typography variant="body2">{space.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {space.slug}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Right column: search & results */}
        <Box flex={{ xs: 1, md: 0.6 }} display="flex" flexDirection="column" gap={1.5}>
          <Card sx={{ borderRadius: 3, flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <SearchIcon fontSize="small" />
                <Typography variant="subtitle2">{t('search')}</Typography>
              </Box>

              <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={1.5}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder={t('searchPlaceholder')}
                  value={search.query}
                  onChange={(e) => search.setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !search.loading) {
                      search.search(8);
                    }
                  }}
                />
                <Select
                  size="small"
                  value={search.spaceId || ''}
                  onChange={(e) => search.setSpaceId(e.target.value || undefined)}
                  displayEmpty
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="">
                    <em>All spaces</em>
                  </MenuItem>
                  {spaces.map((space) => (
                    <MenuItem key={space.id} value={space.id}>
                      {space.name}
                    </MenuItem>
                  ))}
                </Select>
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => search.search(8)}
                  disabled={search.loading || !search.query.trim()}
                >
                  {search.loading ? t('searching', { ns: 'common' }) : t('search', { ns: 'common' })}
                </Button>
              </Box>

              {search.error && (
                <Typography color="error" variant="body2">
                  {search.error}
                </Typography>
              )}

              <Box flex={1} mt={1} sx={{ overflow: 'auto' }}>
                {search.loading && (
                  <Box display="flex" alignItems="center" justifyContent="center" py={2}>
                    <CircularProgress size={24} />
                  </Box>
                )}

                {!search.loading && search.results.length === 0 && !search.error && (
                  <Typography variant="body2" color="text.secondary">
                    {t('noResults')}
                  </Typography>
                )}

                {!search.loading && search.results.length > 0 && (
                  <Box display="flex" flexDirection="column" gap={1}>
                    {search.results.map((chunk) => (
                      <Card
                        key={chunk.chunkId}
                        variant="outlined"
                        sx={{
                          borderRadius: 2,
                          borderStyle: 'dashed',
                          '&:hover': {
                            borderColor: 'primary.main',
                            boxShadow: 3
                          },
                          transition: 'box-shadow 120ms ease-out, border-color 120ms ease-out'
                        }}
                      >
                        <CardContent>
                          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">
                              Score: {chunk.score.toFixed(3)}
                            </Typography>
                            <IconButton size="small">
                              {/* Placeholder for future actions (e.g. open full doc, pin, etc.) */}
                            </IconButton>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont' }}
                          >
                            {chunk.text}
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Create space dialog */}
      <Dialog open={createSpaceOpen} onClose={() => setCreateSpaceOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{t('createSpaceDialog.title')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t('createSpaceDialog.nameLabel')}
            fullWidth
            variant="outlined"
            value={newSpaceName}
            onChange={(e) => setNewSpaceName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newSpaceName.trim()) {
                void handleCreateSpace();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateSpaceOpen(false)}>{t('createSpaceDialog.cancel', { ns: 'knowledge' })}</Button>
          <Button onClick={handleCreateSpace} variant="contained" disabled={!newSpaceName.trim()}>
            {t('createSpaceDialog.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ingest text dialog */}
      <Dialog
        open={ingestDialogOpen}
        onClose={() => (ingesting ? null : setIngestDialogOpen(false))}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{t('ingestDialog.title')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('ingestDialog.titleLabel')}
            fullWidth
            value={ingestTitle}
            onChange={(e) => setIngestTitle(e.target.value)}
          />
          <Select
            fullWidth
            value={ingestSpaceId || ''}
            onChange={(e) => setIngestSpaceId(e.target.value || undefined)}
            displayEmpty
          >
            <MenuItem value="">
              <em>{t('ingestDialog.spaceLabel')}</em>
            </MenuItem>
            {spaces.map((space) => (
              <MenuItem key={space.id} value={space.id}>
                {space.name}
              </MenuItem>
            ))}
          </Select>
          <TextField
            label={t('ingestDialog.textLabel')}
            fullWidth
            multiline
            minRows={6}
            value={ingestText}
            onChange={(e) => setIngestText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIngestDialogOpen(false)} disabled={ingesting}>
            {t('ingestDialog.cancel')}
          </Button>
          <Button
            onClick={handleIngest}
            variant="contained"
            disabled={
              ingesting ||
              !ingestSpaceId ||
              !ingestTitle.trim() ||
              !ingestText.trim()
            }
          >
            {ingesting ? t('ingestDialog.ingesting') : t('ingestDialog.ingest')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications / Bildirimler için Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

