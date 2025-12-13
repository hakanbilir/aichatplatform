// apps/web/src/prompts/PromptTemplateEditorDialog.tsx

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
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { CreatePromptTemplateInput, PromptTemplate, PromptVariable } from '../api/prompts';

interface PromptTemplateEditorDialogProps {
  open: boolean;
  onClose: () => void;
  initialTemplate?: PromptTemplate | null;
  onSave: (input: CreatePromptTemplateInput, existingId?: string) => Promise<void>;
}

export const PromptTemplateEditorDialog: React.FC<PromptTemplateEditorDialogProps> = ({
  open,
  onClose,
  initialTemplate,
  onSave
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'system' | 'user' | 'macro'>('user');
  const [template, setTemplate] = useState('');
  const [isOrgShared, setIsOrgShared] = useState(false);
  const [variables, setVariables] = useState<PromptVariable[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialTemplate) {
      setTitle('');
      setDescription('');
      setKind('user');
      setTemplate('');
      setIsOrgShared(false);
      setVariables([]);
      return;
    }

    setTitle(initialTemplate.title);
    setDescription(initialTemplate.description || '');
    setKind(initialTemplate.kind as 'system' | 'user' | 'macro');
    setTemplate(initialTemplate.template);
    setIsOrgShared(initialTemplate.isOrgShared);
    setVariables(initialTemplate.variables as PromptVariable[]);
  }, [initialTemplate, open]);

  const handleAddVariable = () => {
    const baseName = 'var';
    let index = variables.length + 1;
    let name = `${baseName}${index}`;

    while (variables.some((v) => v.name === name)) {
      index += 1;
      name = `${baseName}${index}`;
    }

    setVariables((prev) => [
      ...prev,
      {
        name,
        label: `Variable ${index}`,
        type: 'string',
        required: false
      }
    ]);
  };

  const handleUpdateVariable = (index: number, patch: Partial<PromptVariable>) => {
    setVariables((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const handleRemoveVariable = (index: number) => {
    setVariables((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim() || !template.trim()) return;

    const input: CreatePromptTemplateInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      kind,
      template,
      variables,
      isOrgShared
    };

    setSaving(true);
    try {
      await onSave(input, initialTemplate?.id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">
          {initialTemplate ? t('editTemplate', { ns: 'prompts' }) : t('newTemplate', { ns: 'prompts' })}
        </Typography>
        <IconButton onClick={onClose} size="small" disabled={saving}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
        <Box display="flex" gap={2} flexDirection={{ xs: 'column', sm: 'row' }}>
          <TextField
            label={t('title', { ns: 'prompts' })}
            fullWidth
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Select
            label={t('kind', { ns: 'prompts' })}
            value={kind}
            onChange={(e) => setKind(e.target.value as any)}
            size="small"
            sx={{ minWidth: 160, mt: { xs: 1, sm: 0 } }}
          >
            <MenuItem value="user">{t('kindUser', { ns: 'prompts' })}</MenuItem>
            <MenuItem value="system">{t('kindSystem', { ns: 'prompts' })}</MenuItem>
            <MenuItem value="macro">{t('kindMacro', { ns: 'prompts' })}</MenuItem>
          </Select>
        </Box>

        <TextField
          label={t('description', { ns: 'prompts' })}
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <TextField
          label={t('template', { ns: 'prompts' })}
          fullWidth
          multiline
          minRows={6}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          helperText={t('templateHelper', { ns: 'prompts' })}
          required
        />

        <FormControlLabel
          control={
            <Switch
              checked={isOrgShared}
              onChange={(e) => setIsOrgShared(e.target.checked)}
            />
          }
          label={t('shareWithOrg', { ns: 'prompts' })}
        />

        <Box>
          <Typography variant="subtitle2" gutterBottom>
            {t('variables', { ns: 'prompts' })}
          </Typography>
          {variables.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('noVariables', { ns: 'prompts' })}
            </Typography>
          )}
          {variables.map((v, index) => (
            <Box
              key={v.name}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1.2fr 1fr auto' },
                gap: 1,
                alignItems: 'center',
                mt: 1
              }}
            >
              <TextField
                label={t('variableName', { ns: 'prompts' })}
                size="small"
                value={v.name}
                onChange={(e) => handleUpdateVariable(index, { name: e.target.value })}
              />
              <TextField
                label={t('variableLabel', { ns: 'prompts' })}
                size="small"
                value={v.label}
                onChange={(e) => handleUpdateVariable(index, { label: e.target.value })}
              />
              <Select
                size="small"
                value={v.type}
                onChange={(e) => handleUpdateVariable(index, { type: e.target.value as any })}
              >
                <MenuItem value="string">{t('variableType.string', { ns: 'prompts' })}</MenuItem>
                <MenuItem value="multiline">{t('variableType.multiline', { ns: 'prompts' })}</MenuItem>
                <MenuItem value="number">{t('variableType.number', { ns: 'prompts' })}</MenuItem>
                <MenuItem value="boolean">{t('variableType.boolean', { ns: 'prompts' })}</MenuItem>
              </Select>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleRemoveVariable(index)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Box mt={1}>
            <Button variant="outlined" size="small" onClick={handleAddVariable}>
              {t('addVariable', { ns: 'prompts' })}
            </Button>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          {t('cancel', { ns: 'common' })}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || !title.trim() || !template.trim()}
        >
          {saving ? t('saving', { ns: 'prompts' }) : t('save', { ns: 'prompts' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

