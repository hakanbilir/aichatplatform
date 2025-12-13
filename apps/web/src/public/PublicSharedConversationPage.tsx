// apps/web/src/public/PublicSharedConversationPage.tsx

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
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import {
  PublicSharedConversation,
  fetchPublicSharedConversation
} from '../api/sharing';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const PublicSharedConversationPage: React.FC = () => {
  const { t } = useTranslation(['public', 'common']);
  const { slug } = useParams<{ slug: string }>();
  const [conversation, setConversation] = useState<PublicSharedConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [needsPassphrase, setNeedsPassphrase] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      if (!slug) return; // Type guard / Tip koruması
      const currentSlug = slug; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPublicSharedConversation(currentSlug);
        setConversation(data);
      } catch (err: any) {
        if (err.message?.includes('INVALID_PASSPHRASE') || err.message?.includes('403')) {
          setNeedsPassphrase(true);
          setPassphraseDialogOpen(true);
        } else {
          setError((err as Error).message || t('failedToLoad'));
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [slug]);

  const handlePassphraseSubmit = async () => {
    if (!slug || !passphrase) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicSharedConversation(slug, passphrase);
      setConversation(data);
      setPassphraseDialogOpen(false);
      setNeedsPassphrase(false);
    } catch (err) {
      setError(t('invalidPassphrase'));
    } finally {
      setLoading(false);
    }
  };

  const gradientBg =
    'radial-gradient(circle at top left, rgba(129,140,248,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%)';

  if (loading && !conversation) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: gradientBg,
          backgroundColor: 'background.default',
          position: 'relative'
        }}
      >
        {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
        <Box
          position="absolute"
          top={16}
          right={16}
        >
          <LanguageSwitcher />
        </Box>
        <Typography>{t('loading')}</Typography>
      </Box>
    );
  }

  if (error && !needsPassphrase) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundImage: gradientBg,
          backgroundColor: 'background.default',
          position: 'relative'
        }}
      >
        {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
        <Box
          position="absolute"
          top={16}
          right={16}
        >
          <LanguageSwitcher />
        </Box>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        p: 2,
        backgroundImage: gradientBg,
        backgroundColor: 'background.default',
        position: 'relative'
      }}
    >
      {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
      <Box
        position="absolute"
        top={16}
        right={16}
      >
        <LanguageSwitcher />
      </Box>
      {conversation && (
        <Box maxWidth="800px" mx="auto">
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <AutoAwesomeIcon fontSize="small" />
            <Typography variant="h5">{conversation.title}</Typography>
          </Box>

          {conversation.createdBy && (
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>
              {t('sharedBy')} {conversation.createdBy.displayName}
            </Typography>
          )}

          <Box display="flex" flexDirection="column" gap={1.5}>
            {conversation.messages.map((msg) => (
              <Card key={msg.id} elevation={0} sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                    {msg.role.toUpperCase()} · {new Date(msg.createdAt).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      <Dialog open={passphraseDialogOpen} onClose={() => {}}>
        <DialogTitle>{t('enterPassphrase')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={t('passphrase')}
            type="password"
            fullWidth
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handlePassphraseSubmit();
              }
            }}
            sx={{ mt: 1 }}
          />
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePassphraseSubmit} variant="contained">
            {loading ? t('submitting') : t('submit')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

