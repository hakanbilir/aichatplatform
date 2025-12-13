// apps/web/src/presets/PresetEditorDialog.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Divider,
  Chip
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import { ConversationPreset, CreateConversationPresetInput } from '../api/presets';
import { useKnowledgeSpaces } from '../knowledge/useKnowledgeSpaces';

interface PresetEditorDialogProps {
  open: boolean;
  onClose: () => void;
  orgId: string | null;
  initialPreset?: ConversationPreset | null;
  onSave: (input: CreateConversationPresetInput, existingId?: string) => Promise<void>;
}

export const PresetEditorDialog: React.FC<PresetEditorDialogProps> = ({
  open,
  onClose,
  orgId,
  initialPreset,
  onSave
}) => {
  const { t } = useTranslation(['presets', 'common']);
  const { spaces } = useKnowledgeSpaces(orgId);

  // Basic fields / Temel alanlar
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');

  // UI Config / UI Yapılandırması
  const [uiColor, setUiColor] = useState('#6366f1');
  const [uiEmoji, setUiEmoji] = useState('✨');
  const [uiIcon, setUiIcon] = useState('');

  // Model Config / Model Yapılandırması
  const [modelId, setModelId] = useState<string>('');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxOutputTokens, setMaxOutputTokens] = useState<number | undefined>(undefined);

  // RAG Config / RAG Yapılandırması
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragSpaceId, setRagSpaceId] = useState<string | null>(null);
  const [ragMaxChunks, setRagMaxChunks] = useState<number>(8);

  // Tools / Araçlar
  const [tools, setTools] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // Reset form when dialog opens/closes or preset changes / Dialog açıldığında veya preset değiştiğinde formu sıfırla
  useEffect(() => {
    if (!open) {
      return;
    }

    if (!initialPreset) {
      // Reset to defaults / Varsayılanlara sıfırla
      setName('');
      setDescription('');
      setSystemPrompt('');
      setUiColor('#6366f1');
      setUiEmoji('✨');
      setUiIcon('');
      setModelId('');
      setTemperature(0.7);
      setMaxOutputTokens(undefined);
      setRagEnabled(false);
      setRagSpaceId(null);
      setRagMaxChunks(8);
      setTools([]);
      return;
    }

    // Load existing preset / Mevcut preset'i yükle
    setName(initialPreset.name);
    setDescription(initialPreset.description || '');
    setSystemPrompt(initialPreset.systemPrompt);
    setUiColor(initialPreset.uiConfig?.color || '#6366f1');
    setUiEmoji(initialPreset.uiConfig?.emoji || '✨');
    setUiIcon(initialPreset.uiConfig?.icon || '');
    setModelId(initialPreset.config?.modelId || '');
    setTemperature(initialPreset.config?.temperature ?? 0.7);
    setMaxOutputTokens(initialPreset.config?.maxOutputTokens);
    setRagEnabled(initialPreset.config?.rag?.enabled || false);
    setRagSpaceId(initialPreset.config?.rag?.spaceId || null);
    setRagMaxChunks(initialPreset.config?.rag?.maxChunks || 8);
    setTools(initialPreset.config?.tools || []);
  }, [initialPreset, open]);

  const handleSave = async () => {
    if (!name.trim() || !systemPrompt.trim()) return;

    const input: CreateConversationPresetInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      systemPrompt: systemPrompt.trim(),
      uiConfig: {
        color: uiColor,
        emoji: uiEmoji,
        ...(uiIcon && { icon: uiIcon })
      },
      config: {
        ...(modelId && { modelId }),
        temperature,
        ...(maxOutputTokens && { maxOutputTokens }),
        ...(tools.length > 0 && { tools }),
        rag: ragEnabled
          ? {
              enabled: true,
              spaceId: ragSpaceId,
              maxChunks: ragMaxChunks
            }
          : undefined
      }
    };

    setSaving(true);
    try {
      await onSave(input, initialPreset?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleAddTool = () => {
    const toolName = prompt(t('addToolPrompt', { ns: 'presets' }) || 'Enter tool name:');
    if (toolName && toolName.trim() && !tools.includes(toolName.trim())) {
      setTools((prev) => [...prev, toolName.trim()]);
    }
  };

  const handleRemoveTool = (tool: string) => {
    setTools((prev) => prev.filter((t) => t !== tool));
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {initialPreset ? t('editPreset') : t('newPreset')}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        {/* Basic Information / Temel Bilgiler */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('basicInfo', { ns: 'common' }) || 'Basic Information'}
          </Typography>
          <TextField
            label={t('name')}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="dense"
          />
          <TextField
            label={t('description')}
            fullWidth
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            margin="dense"
            multiline
            minRows={2}
          />
        </Box>

        <Divider />

        {/* System Prompt / Sistem İsteği */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('systemPrompt')}
          </Typography>
          <TextField
            label={t('systemPrompt')}
            fullWidth
            multiline
            minRows={6}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            required
            helperText={t('systemPromptHelper') || 'Define the AI assistant\'s behavior and instructions'}
          />
        </Box>

        <Divider />

        {/* UI Configuration / UI Yapılandırması */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('uiConfig') || 'UI Configuration'}
          </Typography>
          <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
            <TextField
              label={t('color') || 'Color'}
              type="color"
              value={uiColor}
              onChange={(e) => setUiColor(e.target.value)}
              margin="dense"
              sx={{ flex: 1 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('emoji') || 'Emoji'}
              value={uiEmoji}
              onChange={(e) => setUiEmoji(e.target.value)}
              margin="dense"
              sx={{ flex: 1 }}
              placeholder="✨"
            />
            <TextField
              label={t('icon') || 'Icon'}
              value={uiIcon}
              onChange={(e) => setUiIcon(e.target.value)}
              margin="dense"
              sx={{ flex: 1 }}
              placeholder="icon-name"
            />
          </Box>
        </Box>

        <Divider />

        {/* Model Configuration / Model Yapılandırması */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('modelConfig') || 'Model Configuration'}
          </Typography>
          <TextField
            label={t('modelId') || 'Model ID'}
            fullWidth
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            margin="dense"
            placeholder="e.g., gpt-4, claude-3-opus"
            helperText={t('modelIdHelper') || 'Leave empty to use default model'}
          />
          <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
            <TextField
              label={t('temperature') || 'Temperature'}
              type="number"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value) || 0.7)}
              margin="dense"
              inputProps={{ min: 0, max: 2, step: 0.1 }}
              sx={{ flex: 1 }}
              helperText="0.0 (deterministic) to 2.0 (creative)"
            />
            <TextField
              label={t('maxOutputTokens') || 'Max Output Tokens'}
              type="number"
              value={maxOutputTokens || ''}
              onChange={(e) => setMaxOutputTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)}
              margin="dense"
              inputProps={{ min: 1 }}
              sx={{ flex: 1 }}
              helperText={t('maxOutputTokensHelper') || 'Leave empty for model default'}
            />
          </Box>
        </Box>

        <Divider />

        {/* RAG Configuration / RAG Yapılandırması */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('ragConfig') || 'RAG Configuration'}
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={ragEnabled}
                onChange={(e) => setRagEnabled(e.target.checked)}
              />
            }
            label={t('enableRag') || 'Enable RAG (Retrieval Augmented Generation)'}
          />
          {ragEnabled && (
            <Box mt={2} display="flex" flexDirection="column" gap={1.5}>
              <Select
                fullWidth
                value={ragSpaceId || ''}
                onChange={(e) => setRagSpaceId(e.target.value || null)}
                displayEmpty
                size="small"
              >
                <MenuItem value="">
                  <em>{t('selectSpace') || 'Select Knowledge Space'}</em>
                </MenuItem>
                {spaces.map((space) => (
                  <MenuItem key={space.id} value={space.id}>
                    {space.name}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label={t('maxChunks') || 'Max Chunks'}
                type="number"
                value={ragMaxChunks}
                onChange={(e) => setRagMaxChunks(parseInt(e.target.value, 10) || 8)}
                margin="dense"
                inputProps={{ min: 1, max: 50 }}
                helperText={t('maxChunksHelper') || 'Maximum number of knowledge chunks to retrieve'}
              />
            </Box>
          )}
        </Box>

        <Divider />

        {/* Tools / Araçlar */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('tools') || 'Tools'}
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1} mb={1}>
            {tools.map((tool) => (
              <Chip
                key={tool}
                label={tool}
                onDelete={() => handleRemoveTool(tool)}
                size="small"
              />
            ))}
          </Box>
          <Button variant="outlined" size="small" onClick={handleAddTool}>
            {t('addTool') || 'Add Tool'}
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('cancel', { ns: 'common' })}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !name.trim() || !systemPrompt.trim()}
        >
          {saving ? t('saving', { ns: 'common' }) || 'Saving...' : t('save', { ns: 'common' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
