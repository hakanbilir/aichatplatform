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
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';

import { PromptTemplate } from '../api/prompts';

import { usePromptTemplates } from './usePromptTemplates';

export interface PromptLibraryDrawerProps {
  orgId: string;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  onApplyPrompt: (content: string) => void; // inserts into chat input
  onNewTemplate?: () => void; // opens template editor
  onEditTemplate?: (template: PromptTemplate) => void;
}

interface FilledVariables {
  [name: string]: string;
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
  return t.createdById !== currentUserId;
}

const PromptLibraryDrawerComponent: React.FC<PromptLibraryDrawerProps> = ({
  orgId,
  open,
  onClose,
  currentUserId,
  onApplyPrompt,
  onNewTemplate,
  onEditTemplate,
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
    const vars = template.latestVersion?.variables || {};

    Object.entries(vars).forEach(([key, v]) => {
      initialVars[key] = v.defaultValue || '';
    });

    setVariables(initialVars);
    setApplyDialogOpen(true);
  };

  const handleVariableChange = (name: string, value: string) => {
    setVariables((prev) => ({ ...prev, [name]: value }));
  };

  const handleApply = () => {
    if (!selectedTemplate || !selectedTemplate.latestVersion) return;
    const content = fillTemplate(selectedTemplate.latestVersion.systemPrompt, variables);
    onApplyPrompt(content);
    setApplyDialogOpen(false);
    setSelectedTemplate(null);
    setVariables({});
  };

  const templateVars = useMemo(() => {
    if (!selectedTemplate?.latestVersion?.variables) return [];
    return Object.entries(selectedTemplate.latestVersion.variables).map(([key, val]) => ({
      name: key,
      ...val,
    }));
  }, [selectedTemplate]);

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
            backgroundColor: 'background.default',
          },
        }}
      >
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
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
                {filteredTemplates.map((tpl) => {
                  const isOrg = isOrgTemplate(tpl, currentUserId);
                  const version = tpl.latestVersion;
                  if (!version) return null;
                  const canEdit = tpl.createdById === currentUserId && onEditTemplate;

                  return (
                    <ListItem
                      key={tpl.id}
                      disablePadding
                      secondaryAction={
                        canEdit ? (
                          <IconButton
                            edge="end"
                            aria-label="edit"
                            size="small"
                            onClick={() => onEditTemplate(tpl)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        ) : null
                      }
                    >
                      <ListItemButton
                        onClick={() => handleSelectTemplate(tpl)}
                        sx={{
                          borderRadius: 2,
                          mb: 0.5,
                          pr: canEdit ? 6 : 2, // make space for edit button
                          '&:hover': {
                            backgroundColor: 'action.hover',
                          },
                          transition: 'background-color 120ms ease-out',
                        }}
                      >
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2">{tpl.name}</Typography>
                              {isOrg && (
                                <Chip
                                  size="small"
                                  label={t('library.orgChip')}
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" noWrap>
                              {tpl.description || version.systemPrompt.slice(0, 80)}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
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
          {templateVars.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('library.noVariables')}
            </Typography>
          )}
          {templateVars.map((v) => (
            <TextField
              key={v.name}
              label={v.description || v.name}
              fullWidth
              multiline={false}
              type="text"
              value={variables[v.name] || ''}
              onChange={(e) => handleVariableChange(v.name, e.target.value)}
              required={v.required}
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

// Optimized with React.memo to prevent unnecessary re-renders.
export const PromptLibraryDrawer = React.memo(PromptLibraryDrawerComponent);
