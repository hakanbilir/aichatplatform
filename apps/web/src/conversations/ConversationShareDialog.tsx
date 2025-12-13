// apps/web/src/conversations/ConversationShareDialog.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import LinkIcon from '@mui/icons-material/Link';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from '../auth/AuthContext';
import { createShareLink } from '../api/sharing';

interface ConversationShareDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string;
  conversationId: string;
  basePublicUrl: string; // e.g. https://app.example.com
}

export const ConversationShareDialog: React.FC<ConversationShareDialogProps> = ({
  open,
  onClose,
  orgId,
  conversationId,
  basePublicUrl
}) => {
  const { t } = useTranslation(['conversations', 'common']);
  const { token } = useAuth();

  const [expiresInDays, setExpiresInDays] = useState('7');
  const [passphrase, setPassphrase] = useState('');
  const [anonymize, setAnonymize] = useState(true);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateLink = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const expiresAt = expiresInDays
        ? new Date(Date.now() + (Number(expiresInDays) || 0) * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

      const link = await createShareLink(token, orgId, conversationId, {
        expiresAt,
        passphrase: passphrase || undefined,
        anonymize
      });

      const url = `${basePublicUrl}/s/${link.slug}`;
      setPublicUrl(url);
    } catch (err) {
      setError((err as Error).message || t('share.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('share.title')}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {error && (
          <Typography variant="body2" color="error">
            {error}
          </Typography>
        )}

        {!publicUrl ? (
          <>
            <TextField
              label={t('share.expiresInDays')}
              size="small"
              type="number"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              helperText={t('share.expiresInDaysHelper')}
            />
            <TextField
              label={t('share.passphrase')}
              size="small"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              helperText={t('share.passphraseHelper')}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={anonymize}
                  onChange={(e) => setAnonymize(e.target.checked)}
                />
              }
              label={t('share.anonymize')}
            />
          </>
        ) : (
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
              {t('share.publicUrl')}
            </Typography>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <LinkIcon fontSize="small" />
              <Typography
                variant="body2"
                sx={{ flex: 1, wordBreak: 'break-all' }}
              >
                {publicUrl}
              </Typography>
              <Tooltip title={t('share.copy')}>
                <IconButton size="small" onClick={handleCopy}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {!publicUrl && (
          <Button onClick={handleCreateLink} disabled={loading} variant="contained">
            {loading ? t('share.creating') : t('share.createLink')}
          </Button>
        )}
        <Button onClick={onClose}>{t('close', { ns: 'common' })}</Button>
      </DialogActions>
    </Dialog>
  );
};

