// apps/web/src/org/OrgApiKeysPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import KeyIcon from '@mui/icons-material/VpnKey';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';
import {
  OrgApiKeySummary,
  fetchOrgApiKeys,
  createOrgApiKey,
  deleteOrgApiKey
} from '../api/orgApiKeys';

export const OrgApiKeysPage: React.FC = () => {
  const { t } = useTranslation('org');
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();

  const [keys, setKeys] = useState<OrgApiKeySummary[]>([]);
  const [_loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopesText, setScopesText] = useState('chat:invoke');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [newToken, setNewToken] = useState<string | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(236,72,153,0.15), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.16), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    setLoading(true);
    try {
      const res = await fetchOrgApiKeys(token, orgId);
      setKeys(res.keys);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreate = async () => {
    if (!token || !orgId) return;

    const scopes = scopesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;

    const res = await createOrgApiKey(token, orgId, {
      name: name.trim(),
      description: description.trim() || undefined,
      scopes,
      expiresAt
    });

    setNewToken(res.token);
    setName('');
    setDescription('');
    setScopesText('chat:invoke');
    setExpiresInDays('30');
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!token || !orgId) return;
    await deleteOrgApiKey(token, orgId, id);
    void load();
  };

  const handleCopy = async () => {
    if (!newToken) return;
    try {
      await navigator.clipboard.writeText(newToken);
    } catch {
      // ignore
    }
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
            <Typography variant="h6">{t('apiKeys.title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('apiKeys.description')}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<KeyIcon />}
          onClick={() => {
            setNewToken(null);
            setDialogOpen(true);
          }}
        >
          {t('apiKeys.newApiKey')}
        </Button>
      </Box>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {keys.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('apiKeys.noApiKeys')}
            </Typography>
          )}

          {keys.map((k) => (
            <Box
              key={k.id}
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2
              }}
            >
              <Box>
                <Typography variant="body2">{k.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {k.description || t('apiKeys.noDescription')}
                </Typography>
                <Box mt={0.5} display="flex" flexWrap="wrap" gap={0.5}>
                  {k.scopes.map((s) => (
                    <Box
                      key={s}
                      sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 999,
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="caption">{s}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.5}>
                <Typography variant="caption" color="text.secondary">
                  {t('apiKeys.created')} {new Date(k.createdAt).toLocaleDateString()}
                </Typography>
                {k.expiresAt && (
                  <Typography variant="caption" color="text.secondary">
                    {t('apiKeys.expires')} {new Date(k.expiresAt).toLocaleDateString()}
                  </Typography>
                )}
                <Tooltip title={t('apiKeys.deleteKey')}>
                  <IconButton size="small" onClick={() => handleDelete(k.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('apiKeys.newApiKeyDialogTitle')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label={t('apiKeys.name')}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t('apiKeys.description')}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            label={t('apiKeys.scopes')}
            fullWidth
            value={scopesText}
            onChange={(e) => setScopesText(e.target.value)}
            helperText={t('apiKeys.scopesHelper')}
          />
          <TextField
            label={t('apiKeys.expiresInDays')}
            fullWidth
            type="number"
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
          />

          {newToken && (
            <Box mt={1}>
              <Typography variant="caption" color="text.secondary">
                {t('apiKeys.tokenWarning')}
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  p: 1,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ wordBreak: 'break-all', flex: 1 }}
                >
                  {newToken}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<ContentCopyIcon fontSize="small" />}
                  onClick={handleCopy}
                >
                  {t('apiKeys.copy')}
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {!newToken && (
            <Button
              onClick={handleCreate}
              disabled={!name.trim()}
              variant="contained"
            >
              {t('apiKeys.create')}
            </Button>
          )}
          <Button onClick={() => setDialogOpen(false)}>{t('apiKeys.close')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

