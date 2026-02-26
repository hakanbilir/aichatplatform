// apps/web/src/org/OrgSafetySettingsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';

import { useAuth } from '../auth/AuthContext';
import { fetchOrgSafetyConfig, updateOrgSafetyConfig, OrgSafetyConfigDto } from '../api/orgSafety';

const KNOWN_CATEGORIES: { key: string; label: string }[] = [
  { key: 'self_harm', label: 'Self-harm' },
  { key: 'hate', label: 'Hate' },
  { key: 'sexual_minors', label: 'Sexual content involving minors' },
  { key: 'sexual_content', label: 'Adult sexual content' },
  { key: 'violence', label: 'Violence' },
  { key: 'harassment', label: 'Harassment / bullying' },
  { key: 'malware', label: 'Malware / hacking' },
  { key: 'pii', label: 'Personal data (PII)' },
  { key: 'prompt_injection', label: 'Prompt injection / jailbreak' },
  { key: 'copyright', label: 'Copyright / IP' },
];

const ACTION_OPTIONS: { value: 'block' | 'warn' | 'log_only' | 'allow'; label: string }[] = [
  { value: 'block', label: 'Block' },
  { value: 'warn', label: 'Warn' },
  { value: 'log_only', label: 'Log only' },
  { value: 'allow', label: 'Allow' },
];

export const OrgSafetySettingsPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [config, setConfig] = useState<OrgSafetyConfigDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(248,250,252,0.0), transparent 55%), ' +
    'radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom left, rgba(129,140,248,0.18), transparent 55%)';

  useEffect(() => {
    // Type guard to ensure orgId is a non-empty string
    if (!token || typeof orgId !== 'string' || orgId.length === 0) return;

    const currentOrgId = orgId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // @ts-expect-error - TypeScript can't narrow type across closure, but runtime check ensures safety
        const res = await fetchOrgSafetyConfig(token, currentOrgId);
        if (!cancelled) {
          setConfig(
            res.config || {
              id: 'temp',
              orgId: currentOrgId,
              moderateUserMessages: true,
              moderateAssistantMessages: false,
              categoryActions: {},
              allowedDomains: [],
            },
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError('Failed to load safety configuration.');
        }
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

    setLoading(true);
    setError(null);
    try {
      const res = await updateOrgSafetyConfig(token, orgId, {
        moderateUserMessages: config.moderateUserMessages,
        moderateAssistantMessages: config.moderateAssistantMessages,
        categoryActions: config.categoryActions,
        allowedDomains: config.allowedDomains,
      });

      setConfig(res.config);
    } catch (err) {
      console.error(err);
      setError('Failed to save safety configuration.');
    } finally {
      setLoading(false);
    }
  };

  const setCategoryAction = (category: string, action: 'block' | 'warn' | 'log_only' | 'allow') => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categoryActions: {
          ...prev.categoryActions,
          [category]: action,
        },
      };
    });
  };

  const handleAllowedDomainsChange = (value: string) => {
    const domains = value
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    setConfig((prev) => (prev ? { ...prev, allowedDomains: domains } : prev));
  };

  if (!config && loading) {
    return null; // Or a loading spinner
  }

  if (!config && error) {
    return (
      <Box p={2}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!config) return null;

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: '100%',
        backgroundImage: gradientBg,
        backgroundColor: 'background.default',
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={1}>
          <AutoAwesomeIcon fontSize="small" />
          <Box>
            <Typography variant="h6">Safety & moderation</Typography>
            <Typography variant="caption" color="text.secondary">
              Configure how safety policies are applied to conversations in this organization.
            </Typography>
          </Box>
        </Box>
        <Button variant="contained" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save changes'}
        </Button>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Typography variant="subtitle2">Moderation toggles</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.moderateUserMessages}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, moderateUserMessages: e.target.checked } : prev,
                  )
                }
                disabled={loading}
              />
            }
            label="Moderate user messages before sending to the model"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={config.moderateAssistantMessages}
                onChange={(e) =>
                  setConfig((prev) =>
                    prev ? { ...prev, moderateAssistantMessages: e.target.checked } : prev,
                  )
                }
                disabled={loading}
              />
            }
            label="Moderate assistant responses before showing to users"
          />
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2">Category actions</Typography>
          <Typography variant="caption" color="text.secondary">
            For each category, choose what should happen when it is detected.
          </Typography>

          {KNOWN_CATEGORIES.map((c) => {
            const value = config.categoryActions[c.key] ?? 'block';
            return (
              <Box
                key={c.key}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  py: 0.75,
                }}
              >
                <Box>
                  <Typography variant="body2">{c.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.key}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {ACTION_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="small"
                      variant={value === opt.value ? 'contained' : 'outlined'}
                      onClick={() => setCategoryAction(c.key, opt.value)}
                      disabled={loading}
                    >
                      {opt.label}
                    </Button>
                  ))}
                </Box>
              </Box>
            );
          })}
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 3 }}>
        <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="subtitle2">Allowed domains</Typography>
          <Typography variant="caption" color="text.secondary">
            Used by prompt injection and data exfiltration checks to decide which domains are
            trusted.
          </Typography>

          <TextField
            label="Comma-separated domains"
            value={config.allowedDomains.join(', ')}
            onChange={(e) => handleAllowedDomainsChange(e.target.value)}
            placeholder="https://example.com, https://docs.yourcompany.com"
            disabled={loading}
          />
        </CardContent>
      </Card>
    </Box>
  );
};
