// apps/web/src/org/OrgAiPolicyPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useParams } from 'react-router-dom';
import { useOrgAiPolicy } from './useOrgAiPolicy';
import { OrgAiPolicyConfig } from '../api/orgAiPolicy';

export const OrgAiPolicyPage: React.FC = () => {
  const { t } = useTranslation(['org', 'common']);
  const { orgId } = useParams<{ orgId: string }>();
  const { policy, loading, error, save } = useOrgAiPolicy(orgId || null);

  const [name, setName] = useState(t('policy.defaultName', { ns: 'org' }));
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [tone, setTone] = useState<'formal' | 'casual' | 'neutral' | ''>('');
  const [disallowTopics, setDisallowTopics] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!policy) return;
    setName(policy.name);
    setDescription(policy.description || '');
    setSystemPrompt(policy.systemPrompt);
    setTone(policy.config.tone || '');
    setDisallowTopics((policy.config.disallowTopics || []).join(', '));
  }, [policy]);

  const gradientBg =
    'radial-gradient(circle at top left, rgba(147,197,253,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(244,114,182,0.18), transparent 55%)';

  const handleSave = async () => {
    if (!orgId) return;
    const config: OrgAiPolicyConfig = {
      tone: tone || undefined,
      disallowTopics: disallowTopics
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      extra: {}
    };

    setSaving(true);
    try {
      await save({
        name: name.trim() || t('policy.defaultName', { ns: 'org' }),
        description: description.trim() || undefined,
        systemPrompt,
        config
      });
    } finally {
      setSaving(false);
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
            <Typography variant="h6">{t('policy.title', { ns: 'org' })}</Typography>
            <Typography variant="caption" color="text.secondary">
              {t('policy.description', { ns: 'org' })}
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? t('saving', { ns: 'common' }) : t('saveChanges', { ns: 'common' })}
        </Button>
      </Box>

      <Box display="flex" flexDirection={{ xs: 'column', md: 'row' }} gap={2} flex={1}>
        <Box flex={{ xs: 1, md: 0.55 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {loading && (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={24} />
                </Box>
              )}

              {!loading && error && (
                <Typography color="error" variant="body2">
                  {error}
                </Typography>
              )}

              {!loading && !error && (
                <>
                  <TextField
                    label={t('policy.name', { ns: 'org' })}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label={t('policy.description', { ns: 'org' })}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label={t('policy.systemPrompt', { ns: 'org' })}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    fullWidth
                    multiline
                    minRows={8}
                    helperText={t('policy.systemPromptHelper', { ns: 'org' })}
                  />

                  <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">
                        {t('policy.defaultTone', { ns: 'org' })}
                      </Typography>
                      <Select
                        size="small"
                        fullWidth
                        value={tone}
                        onChange={(e) => setTone(e.target.value as any)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>{t('policy.notSpecified', { ns: 'org' })}</em>
                        </MenuItem>
                        <MenuItem value="formal">{t('policy.toneFormal', { ns: 'org' })}</MenuItem>
                        <MenuItem value="neutral">{t('policy.toneNeutral', { ns: 'org' })}</MenuItem>
                        <MenuItem value="casual">{t('policy.toneCasual', { ns: 'org' })}</MenuItem>
                      </Select>
                    </Box>
                    <Box flex={2}>
                      <TextField
                        label={t('policy.disallowedTopics', { ns: 'org' })}
                        value={disallowTopics}
                        onChange={(e) => setDisallowTopics(e.target.value)}
                        fullWidth
                        size="small"
                      />
                    </Box>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Box>

        <Box flex={{ xs: 1, md: 0.45 }}>
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2">{t('policy.preview', { ns: 'org' })}</Typography>
              <Typography variant="body2" color="text.secondary">
                {t('policy.previewDescription', { ns: 'org' })}
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  {t('policy.systemPromptLabel', { ns: 'org' })}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}
                >
                  {systemPrompt || t('policy.noSystemPrompt', { ns: 'org' })}
                </Typography>
              </Box>

              <Box mt={2}>
                <Typography variant="caption" color="text.secondary">
                  {t('policy.toneLabel', { ns: 'org' })}
                </Typography>
                <Typography variant="body2">
                  {tone || t('policy.notSpecified', { ns: 'org' })}
                </Typography>
              </Box>

              <Box mt={1}>
                <Typography variant="caption" color="text.secondary">
                  {t('policy.disallowedTopicsLabel', { ns: 'org' })}
                </Typography>
                <Typography variant="body2">
                  {disallowTopics || t('policy.noneDefined', { ns: 'org' })}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

