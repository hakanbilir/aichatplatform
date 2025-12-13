// apps/web/src/chat/ConversationSettingsDrawer.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Slider,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../auth/AuthContext';
import {
  ConversationSettings,
  UpdateConversationSettingsPayload,
  getConversationSettings,
  updateConversationSettings,
} from '../api/conversationSettings';
import { ConversationRagSettingsPanel } from './ConversationRagSettings';
import { useParams } from 'react-router-dom';

export interface ConversationSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string | null;
}

const marks = [
  { value: 0, label: '0.0' },
  { value: 0.7, label: '0.7' },
  { value: 1.0, label: '1.0' },
  { value: 1.5, label: '1.5' },
  { value: 2.0, label: '2.0' },
];

export const ConversationSettingsDrawer: React.FC<ConversationSettingsDrawerProps> = ({
  open,
  onClose,
  conversationId,
}) => {
  const { t } = useTranslation(['chat', 'common']);
  const { token } = useAuth();
  const { orgId } = useParams<{ orgId: string }>();

  const [settings, setSettings] = useState<ConversationSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [model, setModel] = useState('default');
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [codeExecution, setCodeExecution] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [structuredTools, setStructuredTools] = useState(false);

  useEffect(() => {
    if (!open || !conversationId || !token) {
      return;
    }

    let cancelled = false;

    async function load() {
      if (!token || !conversationId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getConversationSettings(token, conversationId);
        if (cancelled) return;
        setSettings(data);
        setModel(data.model);
        setTemperature(data.temperature ?? 0.7);
        setSystemPrompt(data.systemPrompt ?? '');
        setCodeExecution(Boolean(data.toolsEnabled?.codeExecution));
        setWebSearch(Boolean(data.toolsEnabled?.webSearch));
        setStructuredTools(Boolean(data.toolsEnabled?.structuredTools));
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message || 'Failed to load conversation settings');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, conversationId, token]);

  const handleSave = async () => {
    if (!token || !conversationId) return;

    const payload: UpdateConversationSettingsPayload = {
      model,
      temperature,
      systemPrompt: systemPrompt.trim() ? systemPrompt : null,
      toolsEnabled: {
        codeExecution,
        webSearch,
        structuredTools,
      },
    };

    setSaving(true);
    setError(null);
    try {
      const updated = await updateConversationSettings(token, conversationId, payload);
      setSettings(updated);
    } catch (err) {
      setError((err as Error).message || 'Failed to update conversation settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 360 } }}>
      <Box
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(circle at top left, rgba(124,77,255,0.16), transparent 55%), radial-gradient(circle at bottom right, rgba(3,218,198,0.12), transparent 55%)',
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between" px={2} py={1.5}>
          <Box>
            <Typography variant="subtitle1">{t('settings.title')}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('settings.tuneBehavior')}
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        <Box flex={1} overflow="auto" px={2} py={2}>
          {loading && (
            <Typography variant="body2" color="text.secondary">
              {t('settings.loading', { ns: 'common' })}
            </Typography>
          )}

          {error && (
            <Typography variant="caption" color="error" display="block" mb={1}>
              {error}
            </Typography>
          )}

          {!loading && (
            <>
              {/* Model */}
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('settings.model')}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label={t('settings.modelKey')}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  helperText={t('settings.modelKeyHelper')}
                />
              </Box>

              {/* Temperature */}
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('settings.temperature')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('settings.temperatureHelper')}
                </Typography>
                <Slider
                  value={temperature}
                  onChange={(_, value) => {
                    if (typeof value === 'number') {
                      setTemperature(value);
                    }
                  }}
                  min={0}
                  max={2}
                  step={0.1}
                  marks={marks}
                  sx={{ mt: 1.5 }}
                />
              </Box>

              {/* System prompt */}
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('settings.systemInstructions')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('settings.systemInstructionsHelper')}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={10}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder={t('settings.systemPromptPlaceholder')}
                  sx={{ mt: 1 }}
                />
              </Box>

              {/* Tools */}
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {t('settings.toolsIntegrations')}
                </Typography>
                <FormControlLabel
                  control={<Switch checked={codeExecution} onChange={(e) => setCodeExecution(e.target.checked)} />}
                  label={t('settings.codeExecution')}
                />
                <FormControlLabel
                  control={<Switch checked={webSearch} onChange={(e) => setWebSearch(e.target.checked)} />}
                  label={t('settings.webSearch')}
                />
                <FormControlLabel
                  control={<Switch checked={structuredTools} onChange={(e) => setStructuredTools(e.target.checked)} />}
                  label={t('settings.structuredTools')}
                />
              </Box>

              {/* RAG Settings */}
              {conversationId && orgId && (
                <Box mb={1}>
                  <Divider sx={{ my: 2 }} />
                  <ConversationRagSettingsPanel
                    conversationId={conversationId}
                    value={(settings as any)?.kbConfig?.rag}
                    onChange={() => {
                      // RAG settings are saved automatically by the component
                    }}
                  />
                </Box>
              )}
            </>
          )}
        </Box>

        <Divider />

        <Box px={2} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {t('settings.changesTakeEffect')}
          </Typography>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={saving || !conversationId || loading}
          >
            {saving ? t('settings.saving') : t('settings.save')}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

