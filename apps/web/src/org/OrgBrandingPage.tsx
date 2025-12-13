// apps/web/src/org/OrgBrandingPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { fetchOrgBranding, updateOrgBranding, OrgBrandingConfigDto } from '../api/orgBranding';

export const OrgBrandingPage: React.FC = () => {
  const { t } = useTranslation(['branding', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { token } = useAuth();

  const [config, setConfig] = useState<OrgBrandingConfigDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(45,212,191,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(129,140,248,0.22), transparent 55%)';

  useEffect(() => {
    if (!token || !orgId) return;

    let cancelled = false;

    async function load() {
      if (!token || !orgId) return; // Type guard / Tip koruması
      const currentOrgId = orgId; // Capture for closure / Kapanış için yakala
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOrgBranding(token, currentOrgId);
        if (!cancelled) {
          setConfig(
            res.config || {
              id: 'temp',
              orgId: currentOrgId,
              displayName: null,
              logoUrl: null,
              faviconUrl: null,
              primaryColor: '#2563EB',
              secondaryColor: null,
              backgroundGradient: null,
              fontFamily: null,
              themeTokens: null,
              hideGlobalBranding: false,
              footerText: null,
              footerLinks: null,
              showLogoOnChat: true
            }
          );
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
    if (!token || !orgId || !config) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateOrgBranding(token, orgId, {
        displayName: config.displayName,
        logoUrl: config.logoUrl,
        primaryColor: config.primaryColor,
        showLogoOnChat: config.showLogoOnChat
      });

      setConfig(res.config);
    } catch (err) {
      setError((err as Error).message || t('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  if (!config) {
    return null;
  }

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
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || loading}>
          {saving ? t('saving') : t('saveChanges', { ns: 'common' })}
        </Button>
      </Box>

      {error && (
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      )}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label={t('displayName')}
            value={config.displayName ?? ''}
            onChange={(e) =>
              setConfig((prev) => (prev ? { ...prev, displayName: e.target.value || null } : prev))
            }
          />

          <TextField
            label={t('logoUrl')}
            value={config.logoUrl ?? ''}
            onChange={(e) =>
              setConfig((prev) => (prev ? { ...prev, logoUrl: e.target.value || null } : prev))
            }
            helperText={t('logoUrlHelper')}
          />

          <TextField
            label={t('primaryColor')}
            value={config.primaryColor ?? ''}
            onChange={(e) =>
              setConfig((prev) => (prev ? { ...prev, primaryColor: e.target.value || null } : prev))
            }
            helperText={t('primaryColorHelper')}
          />

          <FormControlLabel
            control={
              <Switch
                checked={config.showLogoOnChat}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, showLogoOnChat: e.target.checked } : prev
                  )
                }
              />
            }
            label={t('showLogoOnChat')}
          />

          {config.logoUrl && (
            <Box mt={1}>
              <Typography variant="caption" color="text.secondary">
                {t('preview')}
              </Typography>
              <Box mt={0.5} display="flex" alignItems="center" gap={1}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={config.logoUrl}
                  alt={t('logoPreviewAlt')}
                  style={{ width: 40, height: 40, borderRadius: 12 }}
                />
                <Typography variant="body2">{config.displayName || t('organization')}</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

