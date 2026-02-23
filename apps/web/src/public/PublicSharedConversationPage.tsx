// apps/web/src/public/PublicSharedConversationPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  IconButton,
  InputAdornment
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useParams } from 'react-router-dom';

import {
  PublicSharedConversation,
  fetchPublicSharedConversation
} from '../api/sharing';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { BentoGrid } from '../components/ui/kinetic/BentoGrid';
import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';
import { SpecularButton } from '../components/ui/kinetic/SpecularButton';
import { RefractionFilter } from '../components/ui/RefractionFilter';
import { useEcoMode } from '../hooks/useEcoMode';

export const PublicSharedConversationPage: React.FC = () => {
  const { t } = useTranslation(['public', 'common']);
  const { slug } = useParams<{ slug: string }>();
  const { isEcoMode } = useEcoMode();
  const [conversation, setConversation] = useState<PublicSharedConversation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passphraseDialogOpen, setPassphraseDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
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
  }, [slug, t]);

  const handlePassphraseSubmit = async () => {
    if (!slug || !passphrase) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicSharedConversation(slug, passphrase);
      setConversation(data);
      setPassphraseDialogOpen(false);
      setNeedsPassphrase(false);
    } catch {
      setError(t('invalidPassphrase'));
    } finally {
      setLoading(false);
    }
  };

  if (loading && !conversation) {
    return (
      <BentoGrid
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <RefractionFilter />
        {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
        <Box
          position="absolute"
          top={16}
          right={16}
          zIndex={10}
        >
          <LanguageSwitcher />
        </Box>
        <GlassPanel refractive={!isEcoMode} sx={{ p: 4 }}>
            <KineticTypography variant="body1">{t('loading')}</KineticTypography>
        </GlassPanel>
      </BentoGrid>
    );
  }

  if (error && !needsPassphrase) {
    return (
      <BentoGrid
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <RefractionFilter />
        {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
        <Box
          position="absolute"
          top={16}
          right={16}
          zIndex={10}
        >
          <LanguageSwitcher />
        </Box>
        <GlassPanel refractive={!isEcoMode} sx={{ p: 4, borderColor: 'error.main' }}>
            <KineticTypography variant="body1" color="error">{error}</KineticTypography>
        </GlassPanel>
      </BentoGrid>
    );
  }

  return (
    <BentoGrid
      sx={{
        minHeight: '100vh',
        p: 2,
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr', // Single column layout for this page
        gridTemplateRows: 'auto 1fr', // Header area + Content
        gap: 3
      }}
    >
      <RefractionFilter />

      {/* Language Switcher in top-right corner / Sağ üst köşede dil değiştirici */}
      <Box
        position="absolute"
        top={16}
        right={16}
        zIndex={10}
      >
        <LanguageSwitcher />
      </Box>

      {conversation && (
        <Box
          maxWidth="900px"
          width="100%"
          mx="auto"
          display="flex"
          flexDirection="column"
          gap={3}
          zIndex={1}
          height="100%"
        >
          <GlassPanel refractive={!isEcoMode} sx={{ p: 3, flexShrink: 0 }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
              <AutoAwesomeIcon color="primary" />
              <KineticTypography variant="h4" component="h1" fontWeight="bold">
                {conversation.title}
              </KineticTypography>
            </Box>

            {conversation.createdBy && (
              <KineticTypography variant="caption" color="text.secondary" display="block">
                {t('sharedBy')} {conversation.createdBy.displayName}
              </KineticTypography>
            )}
          </GlassPanel>

          <Box display="flex" flexDirection="column" gap={2} flex={1} overflow="auto" pb={4}>
            {conversation.messages.map((msg) => (
              <GlassPanel
                key={msg.id}
                refractive={!isEcoMode}
                sx={{
                    p: 3,
                    borderLeft: msg.role === 'ASSISTANT' || msg.role === 'assistant'
                        ? '4px solid #7c4dff'
                        : '4px solid transparent',
                    backgroundColor: msg.role === 'USER' || msg.role === 'user'
                        ? 'rgba(255,255,255,0.02)'
                        : undefined
                }}
              >
                  <KineticTypography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    gutterBottom
                    sx={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: '0.7rem', fontWeight: 600 }}
                  >
                    {msg.role} · {new Date(msg.createdAt).toLocaleString()}
                  </KineticTypography>
                  <KineticTypography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {msg.content}
                  </KineticTypography>
              </GlassPanel>
            ))}
          </Box>
        </Box>
      )}

      <Dialog
        open={passphraseDialogOpen}
        onClose={() => {}}
        PaperProps={{
            component: GlassPanel, // Use GlassPanel as the Dialog Paper
            refractive: !isEcoMode,
            sx: {
                backgroundImage: 'none',
                backgroundColor: 'rgba(20,20,30,0.8)',
                backdropFilter: 'blur(20px)'
            }
        }}
      >
        <DialogTitle>
            <KineticTypography variant="h6">{t('enterPassphrase')}</KineticTypography>
        </DialogTitle>
        <DialogContent>
          <TextField
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            label={t('passphrase')}
            type={showPassphrase ? 'text' : 'password'}
            fullWidth
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void handlePassphraseSubmit();
              }
            }}
            sx={{ mt: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle passphrase visibility"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                  >
                    {showPassphrase ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <SpecularButton onClick={handlePassphraseSubmit} variant="contained" fullWidth aiAction="submit-passphrase">
            {loading ? t('submitting') : t('submit')}
          </SpecularButton>
        </DialogActions>
      </Dialog>
    </BentoGrid>
  );
};
