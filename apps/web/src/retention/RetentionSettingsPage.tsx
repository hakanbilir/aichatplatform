// apps/web/src/retention/RetentionSettingsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  OrgDataRetentionConfig,
  fetchRetentionConfig,
  updateRetentionConfig
} from '../api/retention';

export const RetentionSettingsPage: React.FC = () => {
  const { t } = useTranslation(['retention', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();

  const [_config, setConfig] = useState<OrgDataRetentionConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [maxAgeDays, setMaxAgeDays] = useState<string>('');
  const [allowUserDeletion, setAllowUserDeletion] = useState(true);
  const [allowExports, setAllowExports] = useState(true);
  const [allowShareLinks, setAllowShareLinks] = useState(true);
  const [hardDeleteDays, setHardDeleteDays] = useState<string>('');

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;

    async function load() {
      if (!token || !orgId) return; // Type guard / Tip koruması
      const currentToken = token; // Capture for closure / Kapanış için yakala
      const currentOrgId = orgId; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const cfg = await fetchRetentionConfig(currentToken, currentOrgId);
        if (!cancelled) {
          setConfig(cfg);
          if (cfg) {
            setMaxAgeDays(cfg.maxConversationAgeDays?.toString() || '');
            setAllowUserDeletion(cfg.allowUserDeletion);
            setAllowExports(cfg.allowExports);
            setAllowShareLinks(cfg.allowShareLinks);
            setHardDeleteDays(cfg.hardDeleteAfterDays?.toString() || '');
          }
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message || t('failedToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [token, orgId]);

  const handleSave = async () => {
    if (!token || !orgId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRetentionConfig(token, orgId, {
        maxConversationAgeDays: maxAgeDays ? Number(maxAgeDays) : null,
        allowUserDeletion,
        allowExports,
        allowShareLinks,
        hardDeleteAfterDays: hardDeleteDays ? Number(hardDeleteDays) : null
      });
      setConfig(updated);
    } catch (err) {
      setError((err as Error).message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const gradientBg =
    'radial-gradient(circle at top left, rgba(251,191,36,0.16), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(59,130,246,0.18), transparent 55%)';

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
      <Box display="flex" alignItems="center" gap={1}>
        <AutoAwesomeIcon fontSize="small" />
        <Box>
          <Typography variant="h6">{t('title')}</Typography>
          <Typography variant="caption" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
      </Box>

      {loading && (
        <Typography variant="body2" color="text.secondary">
          {t('loading', { ns: 'common' })}
        </Typography>
      )}

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      {!loading && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label={t('maxAgeDays')}
              type="number"
              size="small"
              value={maxAgeDays}
              onChange={(e) => setMaxAgeDays(e.target.value)}
              helperText={t('maxAgeDaysHelper')}
            />

            <TextField
              label={t('hardDeleteDays')}
              type="number"
              size="small"
              value={hardDeleteDays}
              onChange={(e) => setHardDeleteDays(e.target.value)}
              helperText={t('hardDeleteDaysHelper')}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={allowUserDeletion}
                  onChange={(e) => setAllowUserDeletion(e.target.checked)}
                />
              }
              label={t('allowUserDeletion')}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={allowExports}
                  onChange={(e) => setAllowExports(e.target.checked)}
                />
              }
              label={t('allowExports')}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={allowShareLinks}
                  onChange={(e) => setAllowShareLinks(e.target.checked)}
                />
              }
              label={t('allowShareLinks')}
            />

            <Box display="flex" justifyContent="flex-end" mt={1}>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('saving') : t('save')}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

