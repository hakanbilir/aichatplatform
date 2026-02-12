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

interface EditableVariable {
  id: string; // internal id for list rendering
  name: string;
  description: string;
  required: boolean;
  defaultValue: string;
}

const PromptTemplateEditorDialogComponent: React.FC<PromptTemplateEditorDialogProps> = ({
  open,
  onClose,
  initialTemplate,
  onSave
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [variables, setVariables] = useState<EditableVariable[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!initialTemplate) {
      setName('');
      setDescription('');
      setSystemPrompt('');
      setVariables([]);
      return;
    }

    setName(initialTemplate.name);
    setDescription(initialTemplate.description || '');

    const version = initialTemplate.latestVersion;
    if (version) {
        setSystemPrompt(version.systemPrompt);
        const vars: EditableVariable[] = Object.entries(version.variables).map(([key, val]) => ({
            id: key,
            name: key,
            description: val.description || '',
            required: val.required ?? false,
            defaultValue: val.defaultValue || ''
        }));
        setVariables(vars);
    } else {
        setSystemPrompt('');
        setVariables([]);
    }
  }, [initialTemplate, open]);

  const handleAddVariable = () => {
    const baseName = 'var';
    let index = variables.length + 1;
    let varName = `${baseName}${index}`;

    while (variables.some((v) => v.name === varName)) {
      index += 1;
      varName = `${baseName}${index}`;
    }

    setVariables((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).substr(2, 9),
        name: varName,
        description: '',
        required: false,
        defaultValue: ''
      }
    ]);
  };

  const handleUpdateVariable = (index: number, patch: Partial<EditableVariable>) => {
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
    if (!name.trim() || !systemPrompt.trim()) return;

    const varsRecord: Record<string, PromptVariable> = {};
    variables.forEach(v => {
        if (v.name.trim()) {
            varsRecord[v.name.trim()] = {
                description: v.description,
                required: v.required,
                defaultValue: v.defaultValue || undefined
            };
        }
    });

    const input: CreatePromptTemplateInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      systemPrompt,
      variables: varsRecord,
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          helperText={t('templateHelper', { ns: 'prompts' })}
          required
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
              key={v.id}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1.5fr auto auto' },
                gap: 1,
                alignItems: 'center',
                mt: 1,
                p: 1,
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 1
              }}
            >
              <TextField
                label={t('variableName', { ns: 'prompts' })}
                size="small"
                value={v.name}
                onChange={(e) => handleUpdateVariable(index, { name: e.target.value })}
                required
              />
              <TextField
                label={t('variableDescription', { ns: 'prompts' })}
                size="small"
                value={v.description}
                onChange={(e) => handleUpdateVariable(index, { description: e.target.value })}
              />
              <FormControlLabel
                control={
                    <Switch
                        size="small"
                        checked={v.required}
                        onChange={(e) => handleUpdateVariable(index, { required: e.target.checked })}
                    />
                }
                label={<Typography variant="caption">{t('required', { ns: 'common' })}</Typography>}
              />

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
          disabled={saving || !name.trim() || !systemPrompt.trim()}
        >
          {saving ? t('saving', { ns: 'prompts' }) : t('save', { ns: 'prompts' })}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Optimized with React.memo to prevent unnecessary re-renders.
export const PromptTemplateEditorDialog = React.memo(PromptTemplateEditorDialogComponent);
