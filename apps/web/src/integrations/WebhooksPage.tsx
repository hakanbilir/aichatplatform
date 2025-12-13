// apps/web/src/integrations/WebhooksPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useWebhooks } from './useWebhooks';

export const WebhooksPage: React.FC = () => {
  const { t } = useTranslation(['webhooks', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { webhooks, loading, error, create, remove, update } = useWebhooks(orgId || null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [eventTypes, setEventTypes] = useState('');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(129,140,248,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%)';

  const handleCreate = async () => {
    if (!orgId) return;

    const types = eventTypes
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    await create({
      name: name.trim(),
      description: description.trim() || undefined,
      url: url.trim(),
      eventTypes: types.length > 0 ? types : undefined
    });

    setDialogOpen(false);
    setName('');
    setDescription('');
    setUrl('');
    setEventTypes('');
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
        <Button
          variant="contained"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setDialogOpen(true)}
        >
          {t('newWebhook')}
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3, flex: 1 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              {t('loading')}
            </Typography>
          )}
          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}
          {!loading && !error && webhooks.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('noWebhooks')}
            </Typography>
          )}

          {!loading && !error && webhooks.length > 0 && (
            <Box display="flex" flexDirection="column" gap={1}>
              {webhooks.map((wh) => (
                <Box
                  key={wh.id}
                  sx={{
                    p: 1.25,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    '&:hover': {
                      borderColor: 'primary.main'
                    },
                    transition: 'border-color 120ms ease-out'
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="body2">{wh.name || wh.url}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {wh.description || t('noDescription')}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip
                        size="small"
                        label={wh.isEnabled ? t('enabled') : t('disabled')}
                        color={wh.isEnabled ? 'success' : 'default'}
                        variant={wh.isEnabled ? 'filled' : 'outlined'}
                        onClick={() => update(wh.id, { isEnabled: !wh.isEnabled })}
                      />
                      <IconButton
                        size="small"
                        onClick={() => remove(wh.id)}
                        title={t('delete')}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <LinkIcon fontSize="small" />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ wordBreak: 'break-all' }}
                    >
                      {wh.url}
                    </Typography>
                  </Box>

                  <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                    {(wh.eventTypes || []).length === 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {t('allEvents')}
                      </Typography>
                    )}
                    {(wh.eventTypes || []).map((t) => (
                      <Chip key={t} size="small" label={t} variant="outlined" />
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('newWebhook')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('name')}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t('description')}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label={t('targetUrl')}
            fullWidth
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            helperText={t('targetUrlHelper')}
          />
          <TextField
            label={t('eventTypes')}
            fullWidth
            value={eventTypes}
            onChange={(e) => setEventTypes(e.target.value)}
            helperText={t('eventTypesHelper')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('cancel', { ns: 'common' })}</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!name.trim() || !url.trim()}
          >
            {t('create')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

