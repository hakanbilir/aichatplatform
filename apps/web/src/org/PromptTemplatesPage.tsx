// apps/web/src/org/PromptTemplatesPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AddIcon from '@mui/icons-material/Add';
import { useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  PromptTemplateDetailDto,
  PromptTemplateVersionDto,
  fetchPromptTemplateDetail,
  createPromptTemplateVersion
} from '../api/prompts';
import { fetchPromptTemplates, PromptTemplate } from '../api/prompts';

export const PromptTemplatesPage: React.FC = () => {
  const { orgId } = useParams();
  const { token } = useAuth();

  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selected, setSelected] = useState<PromptTemplateDetailDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSystemPrompt, setNewSystemPrompt] = useState('');

  const [newVersionPrompt, setNewVersionPrompt] = useState('');

  const gradientBg =
    'radial-gradient(circle at top left, rgba(96,165,250,0.18), transparent 55%), ' +
    'radial-gradient(circle at bottom right, rgba(56,189,248,0.18), transparent 55%)';

  const load = async () => {
    if (!token || !orgId) return;
    const res = await fetchPromptTemplates(token, orgId);
    setTemplates(res);
  };

  const loadDetail = async (id: string) => {
    if (!token || !orgId) return;
    const res = await fetchPromptTemplateDetail(token, orgId, id);
    setSelected(res.template);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, token]);

  const handleCreateTemplate = async () => {
    if (!token || !orgId) return;
    // This would call createPromptTemplateApi - simplified for now
    setDialogOpen(false);
    setNewName('');
    setNewDesc('');
    setNewSystemPrompt('');
    await load();
  };

  const handleAddVersion = async () => {
    if (!token || !orgId || !selected) return;
    await createPromptTemplateVersion(token, orgId, selected.id, {
      systemPrompt: newVersionPrompt
    });
    setNewVersionPrompt('');
    await loadDetail(selected.id);
  };

  const renderVersions = (versions: PromptTemplateVersionDto[] | undefined) => {
    if (!versions || versions.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No versions yet.
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
        {versions.map((v) => (
          <Card key={v.id} sx={{ borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="subtitle2">v{v.version}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {v.createdByDisplayName || 'Unknown'} ·{' '}
                  {new Date(v.createdAt).toLocaleString()}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: 12 }}
              >
                {v.systemPrompt}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: 2,
        display: 'flex',
        gap: 2,
        height: '100%',
        backgroundImage: gradientBg,
        backgroundColor: 'background.default'
      }}
    >
      <Box sx={{ width: 260, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <AutoAwesomeIcon fontSize="small" />
            <Typography variant="subtitle1">Prompt templates</Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setDialogOpen(true)}
          >
            New
          </Button>
        </Box>

        <Card sx={{ flex: 1, borderRadius: 3, overflow: 'auto' }}>
          <CardContent sx={{ p: 0 }}>
            <List dense>
              {templates.map((t) => (
                <ListItemButton
                  key={t.id}
                  selected={selected?.id === t.id}
                  onClick={() => void loadDetail(t.id)}
                >
                  <ListItemText primary={t.title} secondary={t.description || t.template.slice(0, 60)} />
                </ListItemButton>
              ))}
              {templates.length === 0 && (
                <Box p={2}>
                  <Typography variant="body2" color="text.secondary">
                    No templates yet.
                  </Typography>
                </Box>
              )}
            </List>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {selected ? (
          <Card sx={{ borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
              <Typography variant="h6">{selected.name}</Typography>
              {selected.description && (
                <Typography variant="body2" color="text.secondary">
                  {selected.description}
                </Typography>
              )}

              <Typography variant="subtitle2">Versions</Typography>
              {renderVersions(selected.versions)}

              <Box mt={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Add new version
                </Typography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  placeholder="Enter updated system prompt..."
                  value={newVersionPrompt}
                  onChange={(e) => setNewVersionPrompt(e.target.value)}
                />
                <Box mt={1} display="flex" justifyContent="flex-end">
                  <Button
                    size="small"
                    variant="contained"
                    disabled={!newVersionPrompt.trim()}
                    onClick={handleAddVersion}
                  >
                    Save new version
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ) : (
          <Card sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent
              sx={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Select a template to view details.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New prompt template</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <TextField
            label="Description"
            fullWidth
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          <TextField
            label="System prompt"
            multiline
            minRows={4}
            fullWidth
            value={newSystemPrompt}
            onChange={(e) => setNewSystemPrompt(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} disabled={!newName.trim() || !newSystemPrompt.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
