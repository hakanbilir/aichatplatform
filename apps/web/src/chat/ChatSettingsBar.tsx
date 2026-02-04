import React, { memo } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import ExtensionIcon from '@mui/icons-material/Extension';

import { GlassPanel } from '../components/ui/kinetic/GlassPanel';
import { KineticTypography } from '../components/ui/kinetic/KineticTypography';

interface ChatSettingsBarProps {
  title: string;
  model: string;
  models: { value: string; label: string }[];
  temperature: number;
  topP: number;
  dirty: boolean;
  saving: boolean;
  savedAt: number | null;
  usage: {
    totals: { totalTokens: number };
    completions: number;
  } | null;
  conversationId: string | null;
  isEcoMode: boolean;
  onChangeModel: (value: string) => void;
  onChangeTemperature: (event: Event, value: number | number[]) => void;
  onChangeTopP: (event: Event, value: number | number[]) => void;
  onSaveSettings: () => void;
  onResetSettings: () => void;
  onOpenTools: () => void;
  onOpenSettings: () => void;
}

export const ChatSettingsBar: React.FC<ChatSettingsBarProps> = memo(({
  title,
  model,
  models,
  temperature,
  topP,
  dirty,
  saving,
  savedAt,
  usage,
  conversationId,
  isEcoMode,
  onChangeModel,
  onChangeTemperature,
  onChangeTopP,
  onSaveSettings,
  onResetSettings,
  onOpenTools,
  onOpenSettings,
}) => {
  const { t } = useTranslation('chat');

  const creativityLabel =
    temperature < 0.4
      ? t('settings.creativity.precise')
      : temperature < 1
        ? t('settings.creativity.balanced')
        : t('settings.creativity.creative');

  return (
    <GlassPanel
        refractive={!isEcoMode}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          p: 1.5,
          minHeight: 'auto'
        }}
      >
        <Box flex={1} minWidth={0}>
          <KineticTypography variant="subtitle2" noWrap>
            {title}
          </KineticTypography>
          <Typography variant="caption" color="text.secondary">
            {t('settings.modelPerConversation')}
          </Typography>
        </Box>

        <FormControl size="small" sx={{ minWidth: 210 }}>
          <InputLabel id="model-select-label">{t('settings.model')}</InputLabel>
          <Select
            labelId="model-select-label"
            label={t('settings.model')}
            value={model}
            onChange={(e) => onChangeModel(e.target.value)}
          >
            {models.length > 0 ? (
              models.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                {t('models.loading', 'Loading models...')}
              </MenuItem>
            )}
            {/* Fallback if current model is not in list but set */}
            {model && models.length > 0 && !models.find(m => m.value === model) && (
               <MenuItem value={model} disabled>
                  {model} (Unavailable)
               </MenuItem>
            )}
          </Select>
        </FormControl>

        <Box width={160} px={1}>
          <Typography variant="caption" color="text.secondary">
            {t('settings.temperature')}
          </Typography>
          <Slider size="small" value={temperature} min={0} max={2} step={0.1} onChange={onChangeTemperature} aria-label={t('settings.temperature')} />
        </Box>

        <Box width={130} px={1}>
          <Typography variant="caption" color="text.secondary">
            {t('settings.topP')}
          </Typography>
          <Slider size="small" value={topP} min={0} max={1} step={0.05} onChange={onChangeTopP} aria-label={t('settings.topP')} />
        </Box>

        <Chip size="small" label={creativityLabel} sx={{ fontSize: 11, height: 24 }} variant="outlined" />

        {usage && (
          <>
            <Chip
              size="small"
              label={`${t('conversation.tokens')}: ${usage.totals.totalTokens.toLocaleString()}`}
              sx={{ fontSize: 11, height: 24 }}
              variant="outlined"
            />
            <Chip
              size="small"
              label={`${t('conversation.completions')}: ${usage.completions}`}
              sx={{ fontSize: 11, height: 24 }}
              variant="outlined"
            />
          </>
        )}

        <Box display="flex" alignItems="center" gap={1}>
          <Tooltip title={t('settings.toolsPanel')}>
            <span>
              <IconButton
                size="small"
                onClick={onOpenTools}
                disabled={!conversationId}
                aria-label={t('settings.toolsPanel')}
                data-ai-action="open-tools"
              >
                <ExtensionIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('settings.advancedSettings')}>
            <span>
              <IconButton
                size="small"
                onClick={onOpenSettings}
                disabled={!conversationId}
                aria-label={t('settings.advancedSettings')}
                data-ai-action="open-settings"
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={t('settings.resetSettings')}>
            <span>
              <IconButton
                size="small"
                onClick={onResetSettings}
                disabled={!conversationId}
                aria-label={t('settings.resetSettings')}
                data-ai-action="reset-settings"
              >
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title={dirty ? t('settings.saveSettings') : t('settings.settingsUpToDate')}>
            <span>
              <IconButton
                size="small"
                color={dirty ? 'primary' : 'default'}
                onClick={onSaveSettings}
                disabled={!dirty || saving || !conversationId}
                aria-label={dirty ? t('settings.saveSettings') : t('settings.settingsUpToDate')}
                data-ai-action="save-settings"
              >
                <SaveIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {savedAt && !dirty && (
            <Chip
              size="small"
              label={t('conversation.saved')}
              color="success"
              variant="outlined"
              sx={{ height: 22, fontSize: 11 }}
              className="micro-fade-in"
            />
          )}
        </Box>
      </GlassPanel>
  );
});

ChatSettingsBar.displayName = 'ChatSettingsBar';
