// apps/web/src/prompts/PromptLibraryDrawer.tsx

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { PromptTemplate, PromptVariable } from '../api/prompts';
import { usePromptTemplates } from './usePromptTemplates';

export interface PromptLibraryDrawerProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onApplyPrompt: (content: string) => void; // inserts into chat input
  onNewTemplate?: () => void; // opens template editor
}

interface FilledVariables {
  [name: string]: string | number | boolean;
}

const gradientBg =
  'radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 55%), ' +
  'radial-gradient(circle at bottom right, rgba(236,72,153,0.18), transparent 55%)';

function fillTemplate(template: string, variables: FilledVariables): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, name) => {
    const value = variables[name];
    if (value === undefined || value === null) {
      return '';
    }
    return String(value);
  });
}

function isOrgTemplate(t: PromptTemplate, currentUserId: string): boolean {
  return t.isOrgShared && t.createdById !== currentUserId;
}

export const PromptLibraryDrawer: React.FC<PromptLibraryDrawerProps> = ({
  orgId,
  open,
  onClose,
  currentUserId,
  onApplyPrompt,
  onNewTemplate
}) => {
  const { t } = useTranslation(['prompts', 'common']);
  const { templates, loading } = usePromptTemplates(orgId);
  const [tab, setTab] = useState<'all' | 'mine' | 'org'>('all');

  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [variables, setVariables] = useState<FilledVariables>({});
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const filteredTemplates = useMemo(() => {
    if (tab === 'mine') {
      return templates.filter((t) => t.createdById === currentUserId);
    }
    if (tab === 'org') {
      return templates.filter((t) => isOrgTemplate(t, currentUserId));
    }
    return templates;
  }, [tab, templates, currentUserId]);

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    const initialVars: FilledVariables = {};
    template.variables.forEach((v: PromptVariable) => {
      if (v.defaultValue !== undefined) {
        initialVars[v.name] = v.defaultValue;
      } else {
        if (v.type === 'boolean') {
          initialVars[v.name] = false;
        } else {
          initialVars[v.name] = '';
        }
      }
    });
    setVariables(initialVars);
    setApplyDialogOpen(true);
  };

  const handleVariableChange = (v: PromptVariable, raw: string) => {
    let parsed: string | number | boolean = raw;
    if (v.type === 'number') {
      const num = Number(raw);
      parsed = Number.isNaN(num) ? 0 : num;
    }
    if (v.type === 'boolean') {
      parsed = raw === 'true';
    }
    setVariables((prev) => ({ ...prev, [v.name]: parsed }));
  };

  const handleApply = () => {
    if (!selectedTemplate) return;
    const content = fillTemplate(selectedTemplate.template, variables);
    onApplyPrompt(content);
    setApplyDialogOpen(false);
    setSelectedTemplate(null);
    setVariables({});
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            backgroundImage: gradientBg,
            backgroundColor: 'background.default'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon fontSize="small" />
            <Typography variant="subtitle1">{t('library.title')}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1 }}>
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="fullWidth"
            sx={{ mb: 1 }}
          >
            <Tab value="all" label={t('library.all')} />
            <Tab value="mine" label={t('library.mine')} />
            <Tab value="org" label={t('library.org')} />
          </Tabs>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="text.secondary">
              {t('library.description')}
            </Typography>
            {onNewTemplate && (
              <Button
                size="small"
                startIcon={<AddIcon />}
                variant="outlined"
                onClick={onNewTemplate}
              >
                {t('library.newTemplate')}
              </Button>
            )}
          </Box>

          <Divider />

          <Box sx={{ maxHeight: 360, overflowY: 'auto', mt: 1 }}>
            {loading && (
              <Typography variant="body2" color="text.secondary">
                {t('library.loading')}
              </Typography>
            )}
            {!loading && filteredTemplates.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                {t('library.noTemplates')}
              </Typography>
            )}
            {!loading && filteredTemplates.length > 0 && (
              <List dense>
                {filteredTemplates.map((tpl) => (
                  <ListItem key={tpl.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleSelectTemplate(tpl)}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        },
                        transition: 'background-color 120ms ease-out'
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2">{tpl.title}</Typography>
                            {tpl.isOrgShared && (
                              <Chip size="small" label={t('library.orgChip')} variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                          >
                            {tpl.description || tpl.template.slice(0, 80)}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Apply template dialog */}
      <Dialog
        open={applyDialogOpen}
        onClose={() => {
          setApplyDialogOpen(false);
          setSelectedTemplate(null);
          setVariables({});
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('library.fillVariables')}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {selectedTemplate && selectedTemplate.variables.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('library.noVariables')}
            </Typography>
          )}
          {selectedTemplate &&
            selectedTemplate.variables.map((v) => (
              <TextField
                key={v.name}
                label={v.label}
                fullWidth
                multiline={v.type === 'multiline'}
                minRows={v.type === 'multiline' ? 3 : undefined}
                type={v.type === 'number' ? 'number' : v.type === 'boolean' ? 'text' : 'text'}
                value={String(variables[v.name] ?? '')}
                onChange={(e) => handleVariableChange(v, e.target.value)}
                required={v.required}
                helperText={v.type === 'boolean' ? t('library.booleanHelper') : undefined}
              />
            ))}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setApplyDialogOpen(false);
              setSelectedTemplate(null);
              setVariables({});
            }}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button variant="contained" onClick={handleApply}>
            {t('library.applyToInput')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

